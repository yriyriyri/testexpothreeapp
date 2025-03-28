// boxy-viewer-config.ts
import { BodyPartPaths, PartType } from "./boxy-parts";

export interface PaletteData {
  id: number;
  name: string;
  jsonPath: any;
  previewPath: any;
}

export class PaletteManager {
  // Instead of building paths dynamically, list each palette asset explicitly.
  public static readonly palettes: PaletteData[] = [
    {
      id: 0,
      name: "Default",
      jsonPath: require("../boxy-assets/palettes/Palette_0.json"),
      previewPath: require("../boxy-assets/palettes/Palette_0.webp"),
    },
    {
      id: 1,
      name: "Alternative",
      jsonPath: require("../boxy-assets/palettes/Palette_1.json"),
      previewPath: require("../boxy-assets/palettes/Palette_1.webp"),
    },
    {
      id: 2,
      name: "Special",
      jsonPath: require("../boxy-assets/palettes/Palette_2.json"),
      previewPath: require("../boxy-assets/palettes/Palette_2.webp"),
    },
  ];

  public static getPaletteById(id: number): PaletteData | undefined {
    return this.palettes.find((palette) => palette.id === id);
  }

  public static getAllPalettes(): PaletteData[] {
    return [...this.palettes];
  }

  public static getPaletteJsonPaths(): any[] {
    return this.palettes.map((palette) => palette.jsonPath);
  }

  public static getPalettePreviewPaths(): any[] {
    return this.palettes.map((palette) => palette.previewPath);
  }

  public static addNewPalette(name: string): PaletteData {
    const newId = Math.max(...this.palettes.map((p) => p.id)) + 1;
    // Dynamic require is not allowed—new palettes must be manually added.
    const newPalette: PaletteData = {
      id: newId,
      name,
      jsonPath: null, // placeholder
      previewPath: null, // placeholder
    };
    this.palettes.push(newPalette);
    return newPalette;
  }
}

// Update wardrobeItems to use static require calls for image assets.
// const wardrobeItems = {
//   head: [
//     require("../boxy-assets/scenes/Ears/Ears_0.png"),
//     require("../boxy-assets/scenes/Ears/Ears_1.png"),
//     require("../boxy-assets/scenes/Ears/Ears_2.png"),
//     require("../boxy-assets/scenes/Ears/Ears_3.png"),
//     require("../boxy-assets/scenes/Ears/Ears_4.png"),
//     require("../boxy-assets/scenes/Ears/Ears_5.png"),
//     require("../boxy-assets/scenes/Ears/Ears_6.png"),
//     require("../boxy-assets/scenes/Ears/Ears_7.png"),
//     require("../boxy-assets/scenes/Ears/Ears_8.png"),
//     require("../boxy-assets/scenes/Ears/Ears_9.png"),
//     require("../boxy-assets/scenes/Ears/Ears_10.png"),
//     require("../boxy-assets/scenes/Ears/Ears_11.png"),
//     require("../boxy-assets/scenes/Ears/Ears_12.png"),
//   ],
//   body: [
//     require("../boxy-assets/scenes/Body/Body_0.png"),
//     require("../boxy-assets/scenes/Body/Body_1.png"),
//     require("../boxy-assets/scenes/Body/Body_2.png"),
//     require("../boxy-assets/scenes/Body/Body_3.png"),
//     require("../boxy-assets/scenes/Body/Body_4.png"),
//     require("../boxy-assets/scenes/Body/Body_5.png"),
//     require("../boxy-assets/scenes/Body/Body_6.png"),
//     require("../boxy-assets/scenes/Body/Body_7.png"),
//     require("../boxy-assets/scenes/Body/Body_8.png"),
//     require("../boxy-assets/scenes/Body/Body_9.png"),
//     require("../boxy-assets/scenes/Body/Body_10.png"),
//     require("../boxy-assets/scenes/Body/Body_11.png"),
//     require("../boxy-assets/scenes/Body/Body_12.png"),
//   ],
//   legs: [
//     require("../boxy-assets/scenes/Paws/Paws_0.png"),
//     require("../boxy-assets/scenes/Paws/Paws_1.png"),
//     require("../boxy-assets/scenes/Paws/Paws_2.png"),
//     require("../boxy-assets/scenes/Paws/Paws_3.png"),
//     require("../boxy-assets/scenes/Paws/Paws_4.png"),
//     require("../boxy-assets/scenes/Paws/Paws_5.png"),
//     require("../boxy-assets/scenes/Paws/Paws_6.png"),
//     require("../boxy-assets/scenes/Paws/Paws_7.png"),
//     require("../boxy-assets/scenes/Paws/Paws_8.png"),
//     require("../boxy-assets/scenes/Paws/Paws_9.png"),
//     require("../boxy-assets/scenes/Paws/Paws_10.png"),
//     require("../boxy-assets/scenes/Paws/Paws_11.png"),
//     require("../boxy-assets/scenes/Paws/Paws_12.png"),
//   ],
// };

// Update bodyPartPaths so that files are statically required.
const bodyPartPaths: { [key in PartType]: BodyPartPaths } = {
  [PartType.Body]: {
    root: "../boxy-assets/scenes/Body", // informational only
    files: [
      // require("../boxy-assets/scenes/Body/Body_0.glb"),
      require("../boxy-assets/scenes/Body/Body_1.glb"),
      // require("../boxy-assets/scenes/Body/Body_2.glb"),
      // require("../boxy-assets/scenes/Body/Body_3.glb"),
      // require("../boxy-assets/scenes/Body/Body_4.glb"),
      // require("../boxy-assets/scenes/Body/Body_5.glb"),
      // require("../boxy-assets/scenes/Body/Body_6.glb"),
      // require("../boxy-assets/scenes/Body/Body_7.glb"),
      // require("../boxy-assets/scenes/Body/Body_8.glb"),
      // require("../boxy-assets/scenes/Body/Body_9.glb"),
      // require("../boxy-assets/scenes/Body/Body_10.glb"),
      // require("../boxy-assets/scenes/Body/Body_11.glb"),
      // require("../boxy-assets/scenes/Body/Body_12.glb"),
    ],
  },
  [PartType.Ears]: {
    root: "../boxy-assets/scenes/Ears",
    files: [
      // require("../boxy-assets/scenes/Ears/Ears_0.glb"),
      require("../boxy-assets/scenes/Ears/Ears_1.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_2.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_3.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_4.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_5.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_6.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_7.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_8.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_9.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_10.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_11.glb"),
      // require("../boxy-assets/scenes/Ears/Ears_12.glb"),
    ],
  },
  [PartType.Paws]: {
    root: "../boxy-assets/scenes/Paws",
    files: [
      // require("../boxy-assets/scenes/Paws/Paws_0.glb"),
      require("../boxy-assets/scenes/Paws/Paws_1.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_2.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_3.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_4.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_5.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_6.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_7.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_8.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_9.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_10.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_11.glb"),
      // require("../boxy-assets/scenes/Paws/Paws_12.glb"),
    ],
  },
};

export { bodyPartPaths };