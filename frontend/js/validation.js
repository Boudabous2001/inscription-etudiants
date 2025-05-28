// js/validation.js
const Validation = {
    rules: {
        required: (value) => ({
            valid: value.trim() !== '',
            message: 'Ce champ est requis'
        }),
        
        minLength: (min) => (value) => ({
            valid: value.length >= min,
            message: `Minimum ${min} caractères requis`
        }),
        
        maxLength: (max) => (value) => ({
            valid: value.length <= max,
            message: `Maximum ${max} caractères autorisés`
        }),
        
        email: (value) => ({
            valid: Utils.isValidEmail(value),
            message: 'Format email invalide'
        }),
        
        age: (min, max) => (value) => {
            const age = Utils.calculateAge(value);
            return {
                valid: age >= min && age <= max,
                message: `L'âge doit être entre ${min} et ${max} ans`
            };
        }
    },

    validate(value, rules) {
        for (const rule of rules) {
            const result = rule(value);
            if (!result.valid) {
                return result;
            }
        }
        return { valid: true, message: '' };
    }
};