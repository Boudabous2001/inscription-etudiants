const { pool } = require('../config/database');

class Filiere {
    // Récupérer toutes les filières
    static async findAll() {
        const query = 'SELECT * FROM filieres ORDER BY nom ASC';
        
        try {
            const [rows] = await pool.execute(query);
            return rows;
        } catch (error) {
            console.error('❌ Erreur récupération filières:', error);
            throw error;
        }
    }

    // Récupérer une filière par ID
    static async findById(id) {
        const query = 'SELECT * FROM filieres WHERE id = ?';
        
        try {
            const [rows] = await pool.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Erreur récupération filière:', error);
            throw error;
        }
    }

    // Vérifier si une filière existe
    static async exists(id) {
        const query = 'SELECT id FROM filieres WHERE id = ?';
        
        try {
            const [rows] = await pool.execute(query, [id]);
            return rows.length > 0;
        } catch (error) {
            console.error('❌ Erreur vérification filière:', error);
            throw error;
        }
    }
}

module.exports = Filiere;