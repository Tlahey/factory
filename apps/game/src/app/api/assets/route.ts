import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicDir = path.join(process.cwd(), "public");
  const modelsDir = path.join(publicDir, "models");

  const manifest: Record<string, string[]> = {};

  if (!fs.existsSync(modelsDir)) {
    return NextResponse.json(manifest);
  }

  try {
    const topLevelDirs = fs.readdirSync(modelsDir, { withFileTypes: true });
    for (const rawEntry of topLevelDirs) {
      if (rawEntry.isDirectory()) {
        const entityId = rawEntry.name;
        manifest[entityId] = [];

        const entityPath = path.join(modelsDir, entityId);

        const findModels = (currentPath: string, rootRelative: string) => {
          const items = fs.readdirSync(currentPath, { withFileTypes: true });
          for (const item of items) {
            const itemPath = path.join(currentPath, item.name);
            if (item.isDirectory()) {
              findModels(itemPath, path.join(rootRelative, item.name));
            } else if (
              item.name.endsWith(".gltf") ||
              item.name.endsWith(".glb")
            ) {
              const webPath = `/models/${entityId}/${rootRelative ? rootRelative + "/" : ""}${item.name}`;
              const normalizedWebPath = webPath.replace(/\\/g, "/");
              manifest[entityId].push(normalizedWebPath);
            }
          }
        };

        findModels(entityPath, "");
      }
    }

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Failed to scan models directory:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
