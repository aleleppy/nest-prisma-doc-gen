export class Static {
  static readonly AUTO_GENERATED_COMMENT = "// AUTO-GERADO: NÃO EDITAR MANUALMENTE. SUJEITO A PAULADAS!" as const;

  static readonly STATIC_NAMES = [
    "Alessandro",
    "Pablo",
    "Cláudio",
    "Thiago",
    "Guilherme",
    "Dalton",
    "Kaio",
    "Gustavo",
    "Cadu",
    "Neyanne",
    "John",
    "Matheus",
    "Davi",
  ] as const;

  static getRandomString(values: string[]): string {
    const idx = Math.floor(Math.random() * values.length);
    return values[idx];
  }

  static getRandomNumber(min = 0, max = 1000): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}
