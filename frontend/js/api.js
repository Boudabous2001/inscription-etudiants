class API {
    constructor() {
        this.baseURL = 'http://localhost:3001/api';
        this.timeout = 10000; // 10 secondes
    }

    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal,
            ...options
        };

        try {
            console.log(`🚀 API Request: ${options.method || 'GET'} ${this.baseURL}${url}`);
            
            const response = await fetch(`${this.baseURL}${url}`, config);
            clearTimeout(timeoutId);
            
            const responseText = await response.text();
            console.log(`📥 API Response (${response.status}):`, responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                throw new Error('Réponse invalide du serveur');
            }

            if (!response.ok) {
                throw new Error(responseData.error || `Erreur HTTP: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Timeout: Le serveur ne répond pas');
            }
            
            console.error('❌ API Error:', error);
            throw error;
        }
    }

    // Récupérer les filières depuis MySQL
    async getFilieres() {
        return this.request('/filieres');
    }

    // Récupérer les étudiants depuis MySQL
    async getStudents() {
        return this.request('/students');
    }

    // Enregistrer un étudiant en MySQL
    async registerStudent(data) {
        // Nettoyer les données
        const cleanData = {
            nom: data.nom?.trim(),
            prenoms: data.prenoms?.trim(),
            email: data.email?.trim(),
            filiere_id: data.filiere_id,
            date_naissance: data.date_naissance
        };

        console.log('📝 Données à envoyer:', cleanData);

        return this.request('/students', {
            method: 'POST',
            body: JSON.stringify(cleanData)
        });
    }

    // Vérifier l'état du serveur
    async getHealth() {
        return this.request('/health');
    }

    // Statistiques pour le dashboard
    async getStats() {
        try {
            const [studentsResponse, filieresResponse] = await Promise.all([
                this.getStudents(),
                this.getFilieres()
            ]);

            const students = studentsResponse.data || [];
            const filieres = filieresResponse.data || [];

            return {
                totalStudents: students.length,
                totalFilieres: filieres.length,
                enAttente: students.filter(s => s.statut === 'EN_ATTENTE').length,
                students,
                filieres
            };
        } catch (error) {
            console.error('Erreur récupération stats:', error);
            return {
                totalStudents: 0,
                totalFilieres: 0,
                enAttente: 0,
                students: [],
                filieres: []
            };
        }
    }
}

// Instance globale
const api = new API();

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}