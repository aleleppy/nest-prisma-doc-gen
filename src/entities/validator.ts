import { Inside } from "../config.type.js";
export class Validator {
  name: string;
  inside?: Inside;

  constructor(params: { name: string; inside?: Inside }) {
    const { name, inside } = params;

    this.name = name;
    this.inside = inside;
  }

  build(): string {
    if (!this.inside) {
      return `@${this.name}()`;
    }

    const value = this.inside.type === "number" ? this.inside.content : `'${this.inside.content}'`;

    return `@${this.name}(${value})`;
  }
}
