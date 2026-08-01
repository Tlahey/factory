import * as THREE from "three";
import {
  CAMERA_SENSITIVITY,
  CameraBounds,
  DRAG_THRESHOLD_PX,
} from "./CameraConfig";
import {
  RigState,
  ScreenMetrics,
  clampRig,
  createDefaultRig,
  dampRig,
  isRigSettled,
  orbitRig,
  panRig,
  panRigWorld,
  rigCameraPosition,
  zoomRig,
  zoomRigToPoint,
} from "./CameraRig";
import {
  DragMode,
  NavigationScheme,
  ResolvedScheme,
  SchemeDetector,
  classifyPointerDrag,
  classifyWheelGesture,
} from "./CameraGestures";

export interface CameraControllerOptions {
  domElement: HTMLElement;
  camera: THREE.PerspectiveCamera;
  bounds: CameraBounds;
  /** Whether a bare left-drag is allowed to pan (false while a tool is armed). */
  canPan: () => boolean;
  /** Preferred scheme; `auto` lets the controller detect it from wheel events. */
  getScheme: () => NavigationScheme;
  onSchemeDetected: (scheme: ResolvedScheme) => void;
  /** Notifies the game that the camera is being dragged, to suppress clicks. */
  onDragStateChange: (dragging: boolean) => void;
  /** Called whenever the desired rig changes (store sync). */
  onRigChange: (rig: RigState) => void;
  /** Requests a render, needed when the canvas runs in `demand` frameloop. */
  requestFrame: () => void;
}

interface TouchSample {
  x: number;
  y: number;
}

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Trackpad-first camera navigation.
 *
 * Owns every navigation input (wheel, pointer, touch, Safari trackpad
 * gestures, keyboard) and drives an orbit rig. Gesture classification and rig
 * math live in `CameraGestures` / `CameraRig` as pure functions; this class
 * only wires them to the DOM and to the Three.js camera.
 */
export class CameraController {
  /** Where the rig is heading. Gestures write here. */
  desired: RigState;
  /** Where the rig currently is. Damped towards `desired` every frame. */
  current: RigState;

  private readonly detector = new SchemeDetector();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly hitPoint = new THREE.Vector3();

  private dragMode: DragMode = "none";
  private dragPointerId: number | null = null;
  private dragStart = { x: 0, y: 0 };
  private lastPointer = { x: 0, y: 0 };
  private dragExceededThreshold = false;
  private dragging = false;
  private clearDragTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly pressedKeys = new Set<string>();
  private readonly touches = new Map<number, TouchSample>();
  private touchGesture: {
    centroid: TouchSample;
    distance: number;
    angle: number;
  } | null = null;
  private gestureScale = 1;
  private gestureRotation = 0;

  constructor(private readonly options: CameraControllerOptions) {
    this.desired = clampRig(createDefaultRig(), options.bounds);
    this.current = { ...this.desired };
  }

  // ---------------------------------------------------------------- lifecycle

  attach() {
    const dom = this.options.domElement;
    dom.addEventListener("wheel", this.onWheel, { passive: false });
    dom.addEventListener("contextmenu", this.onContextMenu);
    // Safari exposes real two-finger pinch/twist through gesture events.
    dom.addEventListener("gesturestart", this.onGestureStart as EventListener);
    dom.addEventListener(
      "gesturechange",
      this.onGestureChange as EventListener,
    );
    dom.addEventListener("gestureend", this.onGestureEnd as EventListener);

    // Captured on window so the drag flag is set before R3F dispatches the
    // same event to the scene, letting GameInput ignore camera drags.
    window.addEventListener("pointerdown", this.onPointerDown, true);
    window.addEventListener("pointermove", this.onPointerMove, true);
    window.addEventListener("pointerup", this.onPointerUp, true);
    window.addEventListener("pointercancel", this.onPointerUp, true);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onWindowBlur);
  }

  dispose() {
    const dom = this.options.domElement;
    dom.removeEventListener("wheel", this.onWheel);
    dom.removeEventListener("contextmenu", this.onContextMenu);
    dom.removeEventListener(
      "gesturestart",
      this.onGestureStart as EventListener,
    );
    dom.removeEventListener(
      "gesturechange",
      this.onGestureChange as EventListener,
    );
    dom.removeEventListener("gestureend", this.onGestureEnd as EventListener);

    window.removeEventListener("pointerdown", this.onPointerDown, true);
    window.removeEventListener("pointermove", this.onPointerMove, true);
    window.removeEventListener("pointerup", this.onPointerUp, true);
    window.removeEventListener("pointercancel", this.onPointerUp, true);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onWindowBlur);

    if (this.clearDragTimer) clearTimeout(this.clearDragTimer);
    this.setDragging(false);
  }

  // ------------------------------------------------------------- public API

  /** Applies angles coming from the HUD or from a save file. */
  setAngles(azimuth: number, polar: number) {
    this.commit({ ...this.desired, azimuth, polar });
  }

  setDistance(distance: number) {
    this.commit({ ...this.desired, distance });
  }

  setTarget(x: number, z: number) {
    this.commit({ ...this.desired, targetX: x, targetZ: z });
  }

  /** Snaps the rig without damping, e.g. when loading a game. */
  jumpTo(rig: RigState) {
    this.desired = clampRig(rig, this.options.bounds);
    this.current = { ...this.desired };
    this.options.onRigChange(this.desired);
    this.options.requestFrame();
  }

  zoomBy(amount: number) {
    this.commit(zoomRig(this.desired, amount));
  }

  resetView() {
    this.commit(createDefaultRig());
  }

  /** Damps towards the desired rig and writes the result to the camera. */
  update(dt: number) {
    this.applyKeyboard(dt);

    const settled = isRigSettled(this.current, this.desired);
    this.current = settled
      ? { ...this.desired }
      : dampRig(this.current, this.desired, dt);

    const position = rigCameraPosition(this.current);
    const camera = this.options.camera;
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(this.current.targetX, 0, this.current.targetZ);

    if (!settled) this.options.requestFrame();
  }

  // --------------------------------------------------------------- internals

  private commit(rig: RigState) {
    this.desired = clampRig(rig, this.options.bounds);
    this.options.onRigChange(this.desired);
    this.options.requestFrame();
  }

  private get metrics(): ScreenMetrics {
    return {
      viewportHeight: this.options.domElement.clientHeight,
      fovDegrees: this.options.camera.fov,
    };
  }

  private resolveScheme(): ResolvedScheme {
    const preference = this.options.getScheme();
    return preference === "auto" ? this.detector.current : preference;
  }

  /** Projects a client point onto the ground plane. */
  private groundPointAt(clientX: number, clientY: number) {
    const rect = this.options.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.options.camera);
    const hit = this.raycaster.ray.intersectPlane(GROUND_PLANE, this.hitPoint);
    return hit ? { x: hit.x, z: hit.z } : null;
  }

  private applyZoom(
    amount: number,
    toCursor: boolean,
    clientX: number,
    clientY: number,
  ) {
    if (!toCursor) {
      this.commit(zoomRig(this.desired, amount));
      return;
    }
    const focus = this.groundPointAt(clientX, clientY);
    this.commit(
      focus
        ? zoomRigToPoint(this.desired, amount, focus.x, focus.z)
        : zoomRig(this.desired, amount),
    );
  }

  // ------------------------------------------------------------------- wheel

  private onWheel = (event: WheelEvent) => {
    // Always swallow it: otherwise macOS pinch zooms the whole page and
    // two-finger scroll can rubber-band the document.
    event.preventDefault();

    if (this.options.getScheme() === "auto") {
      const previous = this.detector.current;
      const detected = this.detector.feed(event);
      if (detected !== previous) this.options.onSchemeDetected(detected);
    }

    const gesture = classifyWheelGesture(event, this.resolveScheme());

    switch (gesture.kind) {
      case "pan":
        this.commit(panRig(this.desired, gesture.dx, gesture.dy, this.metrics));
        break;
      case "zoom":
        this.applyZoom(
          gesture.amount,
          gesture.toCursor,
          event.clientX,
          event.clientY,
        );
        break;
      case "orbit":
        this.commit(orbitRig(this.desired, gesture.azimuth, gesture.polar));
        break;
    }
  };

  private onContextMenu = (event: Event) => {
    // Two-finger click is the orbit gesture, not a context menu.
    event.preventDefault();
  };

  // -------------------------------------------------- safari trackpad gestures

  private onGestureStart = (event: Event) => {
    event.preventDefault();
    this.gestureScale = 1;
    this.gestureRotation = 0;
  };

  private onGestureChange = (event: Event) => {
    event.preventDefault();
    const gesture = event as Event & { scale?: number; rotation?: number };
    const scale = gesture.scale ?? 1;
    const rotation = gesture.rotation ?? 0;

    if (scale > 0 && this.gestureScale > 0) {
      // Pinching apart (scale > 1) must reduce the distance.
      const amount = -Math.log(scale / this.gestureScale);
      if (amount !== 0) this.commit(zoomRig(this.desired, amount));
    }

    const twist = ((rotation - this.gestureRotation) * Math.PI) / 180;
    if (twist !== 0) {
      this.commit(
        orbitRig(this.desired, twist * CAMERA_SENSITIVITY.twistOrbit, 0),
      );
    }

    this.gestureScale = scale;
    this.gestureRotation = rotation;
  };

  private onGestureEnd = (event: Event) => {
    event.preventDefault();
    this.gestureScale = 1;
    this.gestureRotation = 0;
  };

  // ----------------------------------------------------------------- pointer

  private setDragging(dragging: boolean) {
    if (this.dragging === dragging) return;
    this.dragging = dragging;
    this.options.onDragStateChange(dragging);
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.target !== this.options.domElement) return;

    if (event.pointerType === "touch") {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size === 2) this.beginTouchGesture();
      return;
    }

    const mode = classifyPointerDrag(
      {
        button: event.button,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        spaceHeld: this.pressedKeys.has("Space"),
      },
      this.options.canPan(),
    );
    if (mode === "none") return;

    this.dragMode = mode;
    this.dragPointerId = event.pointerId;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.lastPointer = { ...this.dragStart };
    this.dragExceededThreshold = false;

    // Orbiting never doubles as a click, so claim the gesture immediately.
    if (mode === "orbit") {
      this.dragExceededThreshold = true;
      this.setDragging(true);
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      if (!this.touches.has(event.pointerId)) return;
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.updateTouchGesture();
      return;
    }

    if (this.dragMode === "none" || event.pointerId !== this.dragPointerId)
      return;

    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };

    if (!this.dragExceededThreshold) {
      const travelled = Math.hypot(
        event.clientX - this.dragStart.x,
        event.clientY - this.dragStart.y,
      );
      if (travelled < DRAG_THRESHOLD_PX) return;
      this.dragExceededThreshold = true;
      this.setDragging(true);
    }

    if (this.dragMode === "pan") {
      // The ground follows the pointer, so the view moves the other way.
      this.commit(
        panRig(
          this.desired,
          -dx * CAMERA_SENSITIVITY.dragPan,
          -dy * CAMERA_SENSITIVITY.dragPan,
          this.metrics,
        ),
      );
    } else {
      this.commit(
        orbitRig(
          this.desired,
          -dx * CAMERA_SENSITIVITY.dragOrbitAzimuth,
          -dy * CAMERA_SENSITIVITY.dragOrbitPolar,
        ),
      );
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      this.touches.delete(event.pointerId);
      this.touchGesture = null;
      if (this.touches.size === 2) this.beginTouchGesture();
      return;
    }

    if (event.pointerId !== this.dragPointerId) return;

    const wasDragging = this.dragExceededThreshold;
    this.dragMode = "none";
    this.dragPointerId = null;
    this.dragExceededThreshold = false;

    if (!wasDragging) {
      this.setDragging(false);
      return;
    }

    // Keep the flag up for this event loop turn so the click that ends a
    // camera drag doesn't place or select anything.
    if (this.clearDragTimer) clearTimeout(this.clearDragTimer);
    this.clearDragTimer = setTimeout(() => {
      this.clearDragTimer = null;
      this.setDragging(false);
    }, 0);
  };

  private onWindowBlur = () => {
    this.pressedKeys.clear();
    this.dragMode = "none";
    this.dragPointerId = null;
    this.dragExceededThreshold = false;
    this.touches.clear();
    this.touchGesture = null;
    this.setDragging(false);
  };

  // ------------------------------------------------------------------- touch

  private touchStats() {
    const points = [...this.touches.values()];
    const [a, b] = points;
    return {
      centroid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }

  private beginTouchGesture() {
    this.touchGesture = this.touchStats();
    this.setDragging(true);
  }

  /** Two fingers: drag to pan, pinch to zoom, twist to rotate. */
  private updateTouchGesture() {
    if (this.touches.size !== 2 || !this.touchGesture) return;

    const next = this.touchStats();
    const previous = this.touchGesture;
    this.touchGesture = next;

    let rig = panRig(
      this.desired,
      -(next.centroid.x - previous.centroid.x),
      -(next.centroid.y - previous.centroid.y),
      this.metrics,
    );

    if (previous.distance > 0 && next.distance > 0) {
      rig = zoomRig(rig, -Math.log(next.distance / previous.distance));
    }

    const twist = next.angle - previous.angle;
    if (twist !== 0) {
      rig = orbitRig(rig, Math.atan2(Math.sin(twist), Math.cos(twist)), 0);
    }

    this.commit(rig);
  }

  // ---------------------------------------------------------------- keyboard

  /**
   * Physical key codes rather than `event.key`, so the WASD block stays under
   * the same fingers on AZERTY (where it reads ZQSD) and other layouts.
   */
  private static readonly NAV_CODES = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyQ",
    "KeyE",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Equal",
    "Minus",
    "NumpadAdd",
    "NumpadSubtract",
    "Space",
  ]);

  private shiftHeld = false;

  private isTypingTarget(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    if (!element || !element.tagName) return false;
    const tag = element.tagName.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      element.isContentEditable === true
    );
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey) return;
    if (this.isTypingTarget(event.target)) return;

    this.shiftHeld = event.shiftKey;

    const code = event.code;
    if (code === "Home") {
      this.resetView();
      return;
    }
    if (!CameraController.NAV_CODES.has(code)) return;

    // Space would scroll the page and arrows would move focus.
    if (code === "Space" || code.startsWith("Arrow")) event.preventDefault();
    this.pressedKeys.add(code);
    this.options.requestFrame();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.shiftHeld = event.shiftKey;
    this.pressedKeys.delete(event.code);
  };

  private axis(positive: string, negative: string) {
    return (
      (this.pressedKeys.has(positive) ? 1 : 0) -
      (this.pressedKeys.has(negative) ? 1 : 0)
    );
  }

  private applyKeyboard(dt: number) {
    if (this.pressedKeys.size === 0) return;

    // Shift turns the arrow keys into orbit controls, WASD always pans.
    const arrowsOrbit = this.shiftHeld;
    let rig = this.desired;

    const panRight =
      this.axis("KeyD", "KeyA") +
      (arrowsOrbit ? 0 : this.axis("ArrowRight", "ArrowLeft"));
    const panForward =
      this.axis("KeyW", "KeyS") +
      (arrowsOrbit ? 0 : this.axis("ArrowUp", "ArrowDown"));

    if (panRight !== 0 || panForward !== 0) {
      const step = CAMERA_SENSITIVITY.keyPan * dt;
      rig = panRigWorld(
        rig,
        Math.sign(panRight) * step,
        Math.sign(panForward) * step,
      );
    }

    const rotate =
      this.axis("KeyE", "KeyQ") +
      (arrowsOrbit ? this.axis("ArrowRight", "ArrowLeft") : 0);
    const tilt = arrowsOrbit ? this.axis("ArrowUp", "ArrowDown") : 0;

    if (rotate !== 0 || tilt !== 0) {
      rig = orbitRig(
        rig,
        Math.sign(rotate) * CAMERA_SENSITIVITY.keyOrbitAzimuth * dt,
        Math.sign(tilt) * CAMERA_SENSITIVITY.keyOrbitPolar * dt,
      );
    }

    const zoom =
      this.axis("Minus", "Equal") + this.axis("NumpadSubtract", "NumpadAdd");
    if (zoom !== 0) {
      rig = zoomRig(rig, Math.sign(zoom) * CAMERA_SENSITIVITY.keyZoom * dt);
    }

    if (rig !== this.desired) this.commit(rig);
  }
}
