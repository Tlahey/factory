# Camera Navigation

Trackpad-first camera system. Replaces the previous Drei `MapControls` setup.

## Files

| File                        | Role                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `CameraConfig.ts`           | Limits (zoom, tilt, world bounds), gesture sensitivities, damping rates. Tune feel here.   |
| `CameraRig.ts`              | Pure rig math: pan / orbit / zoom / damping on a `RigState`. No DOM, no Three.js. Tested.  |
| `CameraGestures.ts`         | Pure input classification: wheel → gesture, pointer press → drag mode, trackpad detection. |
| `CameraController.ts`       | Binds DOM events (wheel, pointer, touch, Safari gestures, keyboard) to the rig and camera. |
| `components/GameCamera.tsx` | React glue: instantiates the controller, syncs angles/distance with the Zustand store.     |

The split exists so all gesture behaviour is unit-testable: `CameraRig` and
`CameraGestures` are pure and covered by `*.test.ts`; only the DOM wiring lives
in the controller.

## Rig model

The camera is a focus point on the ground plane (`targetX`, `targetZ`) plus
spherical coordinates (`distance`, `azimuth`, `polar`), matching
`THREE.Spherical`. `polar` is the angle from +Y: small = top-down, large =
near the horizon. It is the value the HUD exposes as "Tilt" and the store keeps
as `cameraElevation`.

Two rigs are kept: `desired` (written by gestures) and `current` (exponentially
damped towards `desired` every frame). Damping is frame-rate independent and
azimuth interpolates along the shortest arc across the ±PI seam.

## Input map

Modifier gestures behave the same in both schemes; only the bare wheel differs.

| Trackpad                                                             | Mouse               | Action         |
| -------------------------------------------------------------------- | ------------------- | -------------- |
| Two-finger scroll                                                    | —                   | Pan            |
| Pinch (ctrl+wheel)                                                   | Ctrl + wheel        | Zoom to cursor |
| ⌥ + scroll                                                           | ⌥ + wheel           | Zoom to cursor |
| ⇧ / ⌘ + scroll                                                       | ⇧ + wheel           | Rotate + tilt  |
| —                                                                    | Wheel               | Zoom to cursor |
| Drag                                                                 | Left drag           | Pan            |
| ⌥ / two-finger click + drag                                          | Right / middle drag | Rotate + tilt  |
| Two-finger pinch / twist (Safari `gesturechange`, or a touch screen) | —                   | Zoom / rotate  |

Keyboard (physical `event.code`, so AZERTY gets ZQSD): WASD/arrows pan, Q/E
rotate, ⇧+arrows rotate & tilt, +/- zoom, Space+drag forces pan, Home resets.

## Trackpad vs mouse detection

`SchemeDetector` votes on the shape of each wheel event (pixel deltas that are
small, fractional or horizontal ⇒ trackpad; large integral vertical steps or
line/page deltas ⇒ mouse) and needs two consistent samples to flip, so a single
odd event can't switch modes mid-gesture. The user can pin the scheme from the
camera help popover (`cameraScheme` in the store, persisted).

## Interaction with GameInput

A bare left-drag only pans when the click isn't meant for the world — no build
tool armed and nothing interactive hovered (`canPan`). Once the camera claims a
gesture it sets `isCameraDragging` in the store, and `GameInput` ignores pointer
down/up while it is set, so ending a camera drag never places or selects
anything. The flag is cleared one event-loop turn after the release.

Pointer listeners are registered on `window` in the **capture** phase so the
flag is set before R3F dispatches the same event to the scene.

## Gotchas

- Every wheel event over the canvas is `preventDefault`ed, otherwise macOS
  pinch zooms the whole page.
- The canvas can run with `frameloop="demand"` (FPS limiter), so any rig change
  must call `requestFrame()` (`invalidate()`); `update()` keeps requesting
  frames until the rig settles.
- Store sync is throttled by an epsilon (angles / distance) to avoid
  re-rendering the HUD on every frame of a gesture.
