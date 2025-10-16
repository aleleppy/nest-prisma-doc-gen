import { Scalar } from "../types.js";

export class Validator {
  name: string;
  content: string;

  constructor(params: { name: string; content?: string }) {
    const { content, name } = params;

    this.name = name;
    this.content = content ?? "";
  }

  build() {
    return `@${this.name}(${this.content})`;
  }
}
