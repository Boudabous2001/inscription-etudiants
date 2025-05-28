const express = require('express');
const path = require('path');
const { testConnection } = require('./config/database');
const Student = require('./models/Student');
const Filiere = require('./models/Filiere');

const app = express();

// CORS manuel
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================

// Route d'accueil
app.get('/', (req, res) => {
    res.json({
        message: '🎓 API Inscription Étudiants avec MySQL',
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Route de santé
app.get('/api/health', async (req, res) => {
    const dbStatus = await testConnection();
    
    res.json({
        status: 'OK',
        database: dbStatus ? 'Connectée' : 'Déconnectée',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        version: process.version
    });
});

// Route filières (depuis MySQL)
app.get('/api/filieres', async (req, res) => {
    try {
        const filieres = await Filiere.findAll();
        
        res.json({
            success: true,
            data: filieres,
            count: filieres.length
        });
    } catch (error) {
        console.error('❌ Erreur récupération filières:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des filières'
        });
    }
});

// Route pour récupérer les étudiants (depuis MySQL)
app.get('/api/students', async (req, res) => {
    try {
        const filters = {};
        
        if (req.query.filiere_id) {
            filters.filiere_id = req.query.filiere_id;
        }
        
        if (req.query.statut) {
            filters.statut = req.query.statut;
        }

        const students = await Student.findAll(filters);
        const total = await Student.count(filters);
        
        res.json({
            success: true,
            data: students,
            count: total
        });
    } catch (error) {
        console.error('❌ Erreur récupération étudiants:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des étudiants'
        });
    }
});

// Route inscription d'un étudiant (SAUVEGARDE MySQL)
app.post('/api/students', async (req, res) => {
    console.log('📥 Nouvelle inscription reçue:', req.body);
    
    const { nom, prenoms, email, filiere_id, date_naissance } = req.body;
    
    try {
        // Validation des champs requis
        const missing = [];
        if (!nom || nom.trim() === '') missing.push('nom');
        if (!prenoms || prenoms.trim() === '') missing.push('prenoms');
        if (!email || email.trim() === '') missing.push('email');
        if (!filiere_id) missing.push('filiere_id');

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Champs manquants: ${missing.join(', ')}`,
                required: ['nom', 'prenoms', 'email', 'filiere_id']
            });
        }

        // Vérifier si l'email existe déjà
        const emailExists = await Student.emailExists(email.trim());
        if (emailExists) {
            return res.status(400).json({
                success: false,
                error: 'Un étudiant avec cet email existe déjà'
            });
        }

        // Vérifier si la filière existe
        const filiereExists = await Filiere.exists(filiere_id);
        if (!filiereExists) {
            return res.status(400).json({
                success: false,
                error: 'Filière sélectionnée invalide'
            });
        }

        // Créer l'étudiant en base de données
        const studentData = {
            nom: nom.trim(),
            prenoms: prenoms.trim(),
            email: email.trim(),
            filiere_id: parseInt(filiere_id),
            date_naissance: date_naissance || null
        };

        const newStudent = await Student.create(studentData);

        console.log('✅ Étudiant sauvegardé en base MySQL:', newStudent.numero_etudiant);

        res.status(201).json({
            success: true,
            message: 'Inscription enregistrée avec succès en base de données',
            data: {
                id: newStudent.id,
                numero_etudiant: newStudent.numero_etudiant,
                nom: newStudent.nom,
                prenoms: newStudent.prenoms,
                email: newStudent.email,
                filiere_nom: newStudent.filiere_nom,
                statut: newStudent.statut,
                date_inscription: newStudent.date_inscription
            }
        });

    } catch (error) {
        console.error('❌ Erreur création étudiant:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'enregistrement de l\'inscription'
        });
    }
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        // Tester la connexion MySQL au démarrage
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Impossible de se connecter à MySQL');
            console.log('📝 Vérifiez que MySQL est démarré et que la base "inscription_etudiants" existe');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(70));
            console.log('🚀 SERVEUR API INSCRIPTION ÉTUDIANTS avec MySQL');
            console.log('='.repeat(70));
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
            console.log(`🎓 Filières: http://localhost:${PORT}/api/filieres`);
            console.log(`👨‍🎓 Étudiants: http://localhost:${PORT}/api/students`);
            console.log(`🗄️ Base de données: MySQL connectée`);
            console.log(`⚡ Node.js: ${process.version}`);
            console.log('='.repeat(70));
            console.log('✅ Serveur prêt ! Les données seront sauvegardées en base MySQL');
            console.log('   Ctrl+C pour arrêter');
            console.log('='.repeat(70) + '\n');
        });

    } catch (error) {
        console.error('❌ Erreur démarrage serveur:', error);
        process.exit(1);
    }
}

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n👋 Serveur arrêté proprement');
    process.exit(0);
});

// Démarrer le serveur
startServer();