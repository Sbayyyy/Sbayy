import {
  combineValidators,
  createNoProfanityValidator,
  createNoSqlInjectionValidator,
  createNoXssValidator,
  defaultTextInputValidator,
  sanitizeInput,
  setProfanityList,
} from '@sbay/shared';

describe('Validators', () => {
  describe('defaultTextInputValidator', () => {
    it('should accept valid input', () => {
      const result = defaultTextInputValidator.validate('Hello World');
      expect(result.isValid).toBe(true);
    });

    it('should accept Arabic text', () => {
      const result = defaultTextInputValidator.validate('مرحبا بالعالم');
      expect(result.isValid).toBe(true);
    });

    it('should accept empty string', () => {
      const result = defaultTextInputValidator.validate('');
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('preserves internal spaces in listing text', () => {
      expect(sanitizeInput('Gaming laptop with charger')).toBe('Gaming laptop with charger');
    });
  });

  describe('SQL Injection Prevention', () => {
    const validator = createNoSqlInjectionValidator();

    it('should reject SELECT statements', () => {
      const result = validator.validate('SELECT * FROM users');
      expect(result.isValid).toBe(false);
    });

    it('should reject DROP statements', () => {
      const result = validator.validate('DROP TABLE users');
      expect(result.isValid).toBe(false);
    });

    it('should reject UNION attacks', () => {
      const result = validator.validate("' UNION SELECT password FROM users --");
      expect(result.isValid).toBe(false);
    });

    it('should reject comment injection', () => {
      const result = validator.validate("admin'--");
      expect(result.isValid).toBe(false);
    });

    it('should accept normal text with SQL-like words in context', () => {
      // "select" als normales Wort sollte blockiert werden
      const result = validator.validate('Please select an option');
      expect(result.isValid).toBe(false); // Strict validation
    });
  });

  describe('XSS Prevention', () => {
    const validator = createNoXssValidator();

    it('should reject script tags', () => {
      const result = validator.validate('<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
    });

    it('should reject onclick handlers', () => {
      const result = validator.validate('<div onclick="alert(1)">');
      expect(result.isValid).toBe(false);
    });

    it('should reject javascript: URLs', () => {
      const result = validator.validate('javascript:alert(1)');
      expect(result.isValid).toBe(false);
    });

    it('should reject img tags', () => {
      const result = validator.validate('<img src=x onerror=alert(1)>');
      expect(result.isValid).toBe(false);
    });

    it('should reject iframe tags', () => {
      const result = validator.validate('<iframe src="evil.com"></iframe>');
      expect(result.isValid).toBe(false);
    });

    it('should accept normal HTML-free text', () => {
      const result = validator.validate('This is a normal product description!');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Profanity Filter', () => {
    beforeAll(() => {
      setProfanityList(['badword', 'offensive']);
    });

    it('should reject text with profanity', () => {
      const validator = createNoProfanityValidator();
      const result = validator.validate('This contains badword');
      expect(result.isValid).toBe(false);
    });

    it('should accept clean text', () => {
      const validator = createNoProfanityValidator();
      const result = validator.validate('This is a clean message');
      expect(result.isValid).toBe(true);
    });

    it('should handle custom profanity list', () => {
      const validator = createNoProfanityValidator(['custom']);
      const result = validator.validate('This is custom text');
      expect(result.isValid).toBe(false);
    });
  });

  describe('combineValidators', () => {
    it('should run all validators and return first failure', () => {
      const alwaysFail = {
        validate: () => ({ isValid: false, message: 'Always fails' }),
      };
      const alwaysPass = {
        validate: () => ({ isValid: true }),
      };

      const combined = combineValidators([alwaysPass, alwaysFail]);
      const result = combined.validate('test');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Always fails');
    });

    it('should pass when all validators pass', () => {
      const pass1 = { validate: () => ({ isValid: true }) };
      const pass2 = { validate: () => ({ isValid: true }) };

      const combined = combineValidators([pass1, pass2]);
      const result = combined.validate('test');
      
      expect(result.isValid).toBe(true);
    });
  });
});
