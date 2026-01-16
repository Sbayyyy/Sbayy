export type ValidationResult = {
  isValid: boolean;
  message?: string;
};

export interface IValidator<T> {
  validate(value: T): ValidationResult;
}

type StringValidatorOptions = {
  message?: string;
  allowEmpty?: boolean;
};

const isEmptyString = (value: string) => value.trim().length === 0;

const createStringValidator = (
  validate: (value: string) => boolean,
  defaultMessage: string,
  options?: StringValidatorOptions
): IValidator<string> => ({
  validate(value: string): ValidationResult {
    if (options?.allowEmpty && isEmptyString(value)) return { isValid: true };
    const ok = validate(value);
    return ok ? { isValid: true } : { isValid: false, message: options?.message ?? defaultMessage };
  }
});

export const combineValidators = <T,>(validators: IValidator<T>[]): IValidator<T> => ({
  validate(value: T): ValidationResult {
    for (const validator of validators) {
      const result = validator.validate(value);
      if (!result.isValid) return result;
    }
    return { isValid: true };
  }
});

let profanityList: string[] = [];
let profanityPattern: RegExp | null = null;

const buildProfanityPattern = (list: string[]) => {
  if (list.length === 0) return null;
  const escaped = list.map((word) =>
    word
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .split("")
      .map((char) => `${char}+`)
      .join("[^a-z0-9]*")
  );
  return new RegExp(`(?:${escaped.join("|")})`, "i");
};

export const setProfanityList = (list: string[]) => {
  profanityList = list;
  profanityPattern = buildProfanityPattern(list);
};

export const loadProfanityListFromUrl = async (url: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) return;
  const text = await response.text();
  const list = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  setProfanityList(list);
};

export const createNoProfanityValidator = (
  list?: string[],
  options?: StringValidatorOptions
): IValidator<string> => {
  const useList = list ?? profanityList;
  const pattern = list ? buildProfanityPattern(useList) : profanityPattern;
  return createStringValidator(
    (value) => (pattern ? !pattern.test(value) : true),
    "Please remove profanity.",
    options
  );
};

const sqlInjectionPattern =
  /(\b(select|insert|update|delete|drop|alter|create|truncate|exec|execute|union)\b|--|;|\/\*|\*\/|@@|char\(|nchar\(|varchar\(|nvarchar\(|xp_)/i;

export const createNoSqlInjectionValidator = (
  options?: StringValidatorOptions
): IValidator<string> =>
  createStringValidator(
    (value) => !sqlInjectionPattern.test(value),
    "Input contains disallowed SQL-like patterns.",
    options
  );

const xssPattern =
  /(<\s*script|<\/\s*script|on\w+\s*=|javascript:|data:text\/html|<\s*iframe|<\s*img|<\s*svg|<\s*object|<\s*embed|<\s*link|<\s*meta)/i;

export const createNoXssValidator = (
  options?: StringValidatorOptions
): IValidator<string> =>
  createStringValidator(
    (value) => !xssPattern.test(value),
    "Input contains disallowed HTML or script content.",
    options
  );

export const noProfanityValidator: IValidator<string> = {
  validate(value: string): ValidationResult {
    return createNoProfanityValidator().validate(value);
  }
};
export const noSqlInjectionValidator = createNoSqlInjectionValidator();
export const noXssValidator = createNoXssValidator();
export const defaultTextInputValidator = combineValidators([
  noProfanityValidator,
  noSqlInjectionValidator,
  noXssValidator
]);
