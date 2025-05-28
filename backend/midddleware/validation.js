const { body } = require('express-validator');

const validateStudentRegistration = [
    body('nom')
        .notEmpty()
        .withMessage('Le nom est requis')
        .isLength({ min: 2, max: 100 })
        .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    
    body('prenoms')
        .notEmpty()
        .withMessage('Les prénoms sont requis')
        .isLength({ min: 2, max: 100 })
        .withMessage('Les prénoms doivent contenir entre 2 et 100 caractères'),
    
    body('date_naissance')
        .isDate()
        .withMessage('Date de naissance invalide')
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
            
            if (age < 16 || age > 100) {
                throw new Error('L\'âge doit être entre 16 et 100 ans');
            }
            return true;
        }),
    
    body('email')
        .isEmail()
        .withMessage('Format d\'e-mail invalide')
        .normalizeEmail(),
    
    body('filiere_id')
        .isInt({ min: 1 })
        .withMessage('Filière invalide')
];

module.exports = { validateStudentRegistration };