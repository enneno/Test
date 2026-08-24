(function () {
    'use strict';

    const minLength = 8;
    const maxLength = 128;
    const hint = '8–128 karakter, legalább egy kisbetű, egy nagybetű és egy szám.';

    window.LUMI_PASSWORD_POLICY = Object.freeze({
        minLength,
        maxLength,
        hint,
        isValid(value) {
            const password = String(value || '');
            return password.length >= minLength
                && password.length <= maxLength
                && /[a-z]/.test(password)
                && /[A-Z]/.test(password)
                && /[0-9]/.test(password);
        }
    });
})();
