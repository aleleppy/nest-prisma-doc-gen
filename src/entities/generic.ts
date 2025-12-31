import { DocGenFile } from "../file.js";
import { config } from "../utils/loader.js";

export class DocGenGeneric {
  file: DocGenFile;

  constructor() {
    const imports = `
      import { ApiProperty } from '@nestjs/swagger';
      import { IsString, IsNotEmpty } from '${config.validatorPath}';
    `;

    const validatorProps = `
      export class DefaultIdDtoDG {
        @ApiProperty({ type: 'string', example: 'cmfxu4njg000008l52v7t8qze', required: true })
        @IsString()
        @IsNotEmpty()
        id!: string;
      }
    `;

    const fileContent = [imports, validatorProps];

    this.file = new DocGenFile({ fileName: "generic.dto.ts", data: fileContent.join("\n"), dir: "" });
  }

  build() {
    this.file.save();
  }
}
