// import { DocGenFile } from "../file.js";
// import { DbName } from "../types.js";

// export type EnumValue = { name: string; dbName: DbName };

// export class DocGenEnum {
//   name: string;
//   values: EnumValue[];
//   dbName: DbName;

//   constructor(params: { name: string; values: EnumValue[]; dbName: DbName }) {
//     const { dbName, name, values } = params;
//     this.dbName = dbName;
//     this.name = name;
//     this.values = values;
//   }
// }

// export class DocEnums {
//   enums: DocGenEnum[];
//   file: DocGenFile;

//   constructor(enums: DocGenEnum[]) {
//     this.enums = enums;

//     this.file = new DocGenFile({
//       dir: "/",
//       fileName: "enums.ts",
//       data: this.build(),
//     });
//   }

//   build() {
//     const enums = this.enums.map((en) => {
//       const enumName = en.name;
//       return `
//         export const ${enumName} = [${en.values.map((n) => `'${n.name}'`)}] as const;
//         export type ${enumName} = typeof ${enumName}[number];
//       `;
//     });

//     return `
//       // AUTO-GERADO: NÃO EDITAR MANUALMENTE. SUJEITO A PAULADAS!
//       ${enums.join("\n")}
//     `;
//   }
// }
