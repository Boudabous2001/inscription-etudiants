const { pool } = require('../config/database');

class Student {
    // Créer un nouvel étudiant
    static async create(studentData) {
        const {
            nom,
            prenoms,
            date_naissance,
            email,
            filiere_id,
            photo_url = null
        } = studentData;

        // Générer un numéro étudiant unique
        const numeroEtudiant = await this.generateNumeroEtudiant();

        const query = `
            INSERT INTO etudiants (
                nom, prenoms, date_naissance, email, filiere_id, 
                photo_url, numero_etudiant, statut, date_inscription
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'EN_ATTENTE', NOW())
        `;

        try {
            const [result] = await pool.execute(query, [
                nom, prenoms, date_naissance, email, filiere_id,
                photo_url, numeroEtudiant
            ]);

            // Récupérer l'étudiant créé
            const newStudent = await this.findById(result.insertId);
            
            console.log('✅ Étudiant créé en base:', newStudent);
            return newStudent;
        } catch (error) {
            console.error('❌ Erreur création étudiant:', error);
            throw new Error('Erreur lors de la création de l\'étudiant');
        }
    }

    // Récupérer un étudiant par ID
    static async findById(id) {
        const query = `
            SELECT e.*, f.nom as filiere_nom, f.code as filiere_code
            FROM etudiants e
            LEFT JOIN filieres f ON e.filiere_id = f.id
            WHERE e.id = ?
        `;

        try {
            const [rows] = await pool.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Erreur récupération étudiant:', error);
            throw error;
        }
    }

    // Récupérer tous les étudiants
    static async findAll(filters = {}) {
        let query = `
            SELECT e.*, f.nom as filiere_nom, f.code as filiere_code
            FROM etudiants e
            LEFT JOIN filieres f ON e.filiere_id = f.id
        `;
        
        const conditions = [];
        const params = [];

        if (filters.filiere_id) {
            conditions.push('e.filiere_id = ?');
            params.push(filters.filiere_id);
        }

        if (filters.statut) {
            conditions.push('e.statut = ?');
            params.push(filters.statut);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY e.date_inscription DESC';

        try {
            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('❌ Erreur récupération étudiants:', error);
            throw error;
        }
    }

    // Vérifier si un email existe déjà
    static async emailExists(email) {
        const query = 'SELECT id FROM etudiants WHERE email = ?';
        
        try {
            const [rows] = await pool.execute(query, [email]);
            return rows.length > 0;
        } catch (error) {
            console.error('❌ Erreur vérification email:', error);
            throw error;
        }
    }

    // Générer un numéro étudiant unique
    static async generateNumeroEtudiant() {
        const year = new Date().getFullYear();
        let numeroEtudiant;
        let exists = true;

        while (exists) {
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            numeroEtudiant = `ET${year}${randomNum}`;

            // Vérifier si le numéro existe déjà
            const query = 'SELECT id FROM etudiants WHERE numero_etudiant = ?';
            const [rows] = await pool.execute(query, [numeroEtudiant]);
            exists = rows.length > 0;
        }

        return numeroEtudiant;
    }

    // Compter les étudiants
    static async count(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM etudiants';
        const conditions = [];
        const params = [];

        if (filters.filiere_id) {
            conditions.push('filiere_id = ?');
            params.push(filters.filiere_id);
        }

        if (filters.statut) {
            conditions.push('statut = ?');
            params.push(filters.statut);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        try {
            const [rows] = await pool.execute(query, params);
            return rows[0].total;
        } catch (error) {
            console.error('❌ Erreur comptage étudiants:', error);
            throw error;
        }
    }
}

module.exports = Student;