// Variables globales
let currentStep = 1;
let filieresData = [];
let formSubmitted = false;

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Application démarrée');
    
    // Tester la connexion au serveur
    try {
        const health = await api.getHealth();
        console.log('✅ Serveur connecté:', health);
    } catch (error) {
        console.error('❌ Serveur non accessible:', error);
        showAlert('Attention: Le serveur n\'est pas accessible. Certaines fonctionnalités peuvent ne pas fonctionner.', 'warning');
    }

    // Charger les données initiales
    await loadInitialData();
    
    // Initialiser le formulaire
    initializeForm();
});

// Charger les données depuis MySQL
async function loadInitialData() {
    try {
        showLoadingState(true);
        
        // Charger les statistiques et filières
        const stats = await api.getStats();
        
        // Mettre à jour les statistiques dans le header
        updateStatsDisplay(stats);
        
        // Charger les filières dans le select
        await loadFilieresSelect(stats.filieres);
        
        console.log('📊 Données chargées:', stats);
        
    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
        showAlert('Erreur lors du chargement des données. Rechargez la page.', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Mettre à jour l'affichage des statistiques
function updateStatsDisplay(stats) {
    const totalStudentsEl = document.getElementById('total-students');
    const totalFilieresEl = document.getElementById('total-filieres');
    
    if (totalStudentsEl) {
        animateNumber(totalStudentsEl, stats.totalStudents);
    }
    
    if (totalFilieresEl) {
        animateNumber(totalFilieresEl, stats.totalFilieres);
    }
}

// Animation des nombres
function animateNumber(element, targetNumber) {
    const startNumber = parseInt(element.textContent) || 0;
    const duration = 1000; // 1 seconde
    const startTime = Date.now();
    
    function updateNumber() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * progress);
        element.textContent = currentNumber;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    updateNumber();
}

// Charger les filières dans le select
async function loadFilieresSelect(filieres = null) {
    try {
        if (!filieres) {
            const response = await api.getFilieres();
            filieres = response.data || [];
        }
        
        filieresData = filieres;
        const select = document.getElementById('filiere_id');
        
        if (select) {
            select.innerHTML = '<option value="">Choisissez votre filière</option>';
            
            filieres.forEach(filiere => {
                const option = document.createElement('option');
                option.value = filiere.id;
                option.textContent = `${filiere.nom} (${filiere.code})`;
                select.appendChild(option);
            });
            
            console.log(`✅ ${filieres.length} filières chargées`);
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement filières:', error);
        showAlert('Erreur lors du chargement des filières', 'error');
    }
}

// Gestion de la soumission du formulaire
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (formSubmitted) {
        console.log('⚠️ Formulaire déjà soumis');
        return;
    }
    
    console.log('📝 Soumission du formulaire...');
    
    try {
        // Marquer comme soumis pour éviter les doubles soumissions
        formSubmitted = true;
        
        // Afficher le modal de chargement
        showModal('loading-modal');
        
        // Récupérer les données du formulaire
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        
        console.log('📋 Données du formulaire:', data);
        
        // Validation côté client
        const validation = validateFormData(data);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        // Envoyer à l'API MySQL
        const response = await api.registerStudent(data);
        
        console.log('✅ Réponse API:', response);
        
        if (response.success) {
            // Fermer le modal de chargement
            closeModal('loading-modal');
            
            // Afficher le modal de succès avec les détails
            showSuccessModal(response.data);
            
            // Réinitialiser le formulaire après un délai
            setTimeout(() => {
                resetForm();
                formSubmitted = false;
            }, 3000);
            
        } else {
            throw new Error(response.error || 'Erreur lors de l\'inscription');
        }
        
    } catch (error) {
        console.error('❌ Erreur soumission:', error);
        
        // Fermer le modal de chargement
        closeModal('loading-modal');
        
        // Afficher l'erreur
        showAlert(`Erreur: ${error.message}`, 'error');
        
        // Permettre une nouvelle soumission
        formSubmitted = false;
    }
}

// Afficher le modal de succès avec détails de l'étudiant
function showSuccessModal(studentData) {
    const modal = document.getElementById('success-modal');
    const messageEl = document.getElementById('success-message');
    
    if (modal && messageEl) {
        // Trouver la filière
        const filiere = filieresData.find(f => f.id == studentData.filiere_id);
        
        const detailsHTML = `
            <div style="text-align: left; background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                <h4 style="color: #28a745; margin-bottom: 1rem;">
                    <i class="fas fa-id-card"></i> Détails de votre inscription
                </h4>
                <p><strong>📋 Numéro d'étudiant:</strong> <span style="color: #007bff; font-weight: bold;">${studentData.numero_etudiant}</span></p>
                <p><strong>👤 Nom complet:</strong> ${studentData.nom} ${studentData.prenoms}</p>
                <p><strong>📧 Email:</strong> ${studentData.email}</p>
                <p><strong>🎓 Filière:</strong> ${filiere ? filiere.nom : 'Non définie'}</p>
                <p><strong>📅 Date d'inscription:</strong> ${new Date(studentData.date_inscription).toLocaleDateString('fr-FR')}</p>
                <p><strong>📊 Statut:</strong> <span style="color: #ffc107;">${studentData.statut}</span></p>
            </div>
            <p style="margin-top: 1rem;">
                <i class="fas fa-envelope"></i> 
                Un email de confirmation avec votre numéro d'étudiant vous a été envoyé.
            </p>
            <p>
                <i class="fas fa-info-circle"></i> 
                Vous pouvez maintenant fermer cette fenêtre et naviguer vers d'autres sections.
            </p>
        `;
        
        messageEl.innerHTML = detailsHTML;
        showModal('success-modal');
        
        // Auto-fermeture après 10 secondes
        setTimeout(() => {
            closeModal('success-modal');
            // Rediriger vers la page d'accueil ou recharger les stats
            window.location.href = '#home';
            loadInitialData(); // Recharger les stats
        }, 10000);
    }
}

// Validation des données du formulaire
function validateFormData(data) {
    const errors = [];
    
    if (!data.nom || data.nom.trim().length < 2) {
        errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!data.prenoms || data.prenoms.trim().length < 2) {
        errors.push('Les prénoms doivent contenir au moins 2 caractères');
    }
    
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('L\'email n\'est pas valide');
    }
    
    if (!data.filiere_id) {
        errors.push('Veuillez sélectionner une filière');
    }
    
    if (!data.date_naissance) {
        errors.push('La date de naissance est requise');
    } else {
        const birthDate = new Date(data.date_naissance);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 16 || age > 100) {
            errors.push('L\'âge doit être entre 16 et 100 ans');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validation email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Réinitialiser le formulaire
function resetForm() {
    const form = document.getElementById('inscription-form');
    if (form) {
        form.reset();
        
        // Retourner à la première étape
        currentStep = 1;
        updateFormStep();
        
        // Nettoyer les erreurs
        clearAllErrors();
        
        console.log('🔄 Formulaire réinitialisé');
    }
}

// Gestion des états de chargement
function showLoadingState(show) {
    const elements = document.querySelectorAll('.btn, .form-input, .form-select');
    
    elements.forEach(el => {
        if (show) {
            el.disabled = true;
            el.style.opacity = '0.6';
        } else {
            el.disabled = false;
            el.style.opacity = '1';
        }
    });
}

// Gestion des modaux
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Initialisation du formulaire
function initializeForm() {
    const form = document.getElementById('inscription-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('✅ Formulaire initialisé');
    }
}

// Affichage des alertes
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Nettoyer toutes les erreurs
function clearAllErrors() {
    const errorElements = document.querySelectorAll('.form-error');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

// Fonction pour faire défiler vers le formulaire
function scrollToForm() {
    const formSection = document.getElementById('inscription');
    if (formSection) {
        formSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Actualisation périodique des stats (toutes les 30 secondes)
setInterval(async () => {
    try {
        const stats = await api.getStats();
        updateStatsDisplay(stats);
    } catch (error) {
        console.log('⚠️ Erreur actualisation stats:', error.message);
    }
}, 30000);

console.log('✅ Module app.js chargé avec intégration MySQL');


// ========================================
// FONCTIONS DE NAVIGATION DU FORMULAIRE
// ========================================

// Variables globales pour la navigation
const totalSteps = 3;

// Fonction pour aller à l'étape suivante
function nextStep(step) {
    console.log(`➡️ Passage à l'étape suivante depuis l'étape ${step}`);
    
    // Valider l'étape actuelle avant de passer à la suivante
    if (validateStep(step)) {
        if (step < totalSteps) {
            currentStep = step + 1;
            updateFormStep();
            updateConfirmationData(); // Mettre à jour les données de confirmation
        }
    } else {
        console.log('❌ Validation échouée pour l\'étape', step);
    }
}

// Fonction pour revenir à l'étape précédente
function prevStep(step) {
    console.log(`⬅️ Retour à l'étape précédente depuis l'étape ${step}`);
    
    if (step > 1) {
        currentStep = step - 1;
        updateFormStep();
    }
}

// Mettre à jour l'affichage des étapes
function updateFormStep() {
    console.log(`🔄 Mise à jour affichage étape ${currentStep}`);
    
    // Mettre à jour les étapes du formulaire
    document.querySelectorAll('.form-step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Mettre à jour la barre de progression
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Scroll vers le haut du formulaire
    const formSection = document.getElementById('inscription');
    if (formSection) {
        formSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Validation d'une étape spécifique
function validateStep(step) {
    console.log(`🔍 Validation de l'étape ${step}`);
    
    let isValid = true;
    const errors = [];
    
    // Nettoyer les erreurs précédentes
    clearStepErrors(step);
    
    switch(step) {
        case 1:
            // Validation étape 1 : Informations personnelles
            const nom = document.getElementById('nom').value.trim();
            const prenoms = document.getElementById('prenoms').value.trim();
            const dateNaissance = document.getElementById('date_naissance').value;
            const email = document.getElementById('email').value.trim();
            
            if (!nom || nom.length < 2) {
                showFieldError('nom', 'Le nom doit contenir au moins 2 caractères');
                isValid = false;
            }
            
            if (!prenoms || prenoms.length < 2) {
                showFieldError('prenoms', 'Les prénoms doivent contenir au moins 2 caractères');
                isValid = false;
            }
            
            if (!dateNaissance) {
                showFieldError('date_naissance', 'La date de naissance est requise');
                isValid = false;
            } else {
                // Vérifier l'âge
                const birthDate = new Date(dateNaissance);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                
                if (age < 16) {
                    showFieldError('date_naissance', 'Vous devez avoir au moins 16 ans');
                    isValid = false;
                } else if (age > 100) {
                    showFieldError('date_naissance', 'Âge invalide');
                    isValid = false;
                }
            }
            
            if (!email || !isValidEmail(email)) {
                showFieldError('email', 'Veuillez saisir un email valide');
                isValid = false;
            }
            
            break;
            
        case 2:
            // Validation étape 2 : Filière et photo
            const filiereId = document.getElementById('filiere_id').value;
            
            if (!filiereId) {
                showFieldError('filiere_id', 'Veuillez sélectionner une filière');
                isValid = false;
            }
            
            // La photo est optionnelle, pas de validation nécessaire
            
            break;
            
        case 3:
            // Validation étape 3 : Confirmation
            const termsCheckbox = document.getElementById('terms');
            
            if (!termsCheckbox.checked) {
                showAlert('Vous devez accepter les conditions d\'utilisation pour continuer', 'error');
                isValid = false;
            }
            
            break;
    }
    
    if (isValid) {
        console.log(`✅ Étape ${step} validée avec succès`);
    } else {
        console.log(`❌ Étape ${step} contient des erreurs`);
    }
    
    return isValid;
}

// Afficher une erreur pour un champ spécifique
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    const fieldElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = '#dc3545';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '0.25rem';
    }
    
    if (fieldElement) {
        fieldElement.style.borderColor = '#dc3545';
        fieldElement.classList.add('error');
        
        // Retirer l'erreur quand l'utilisateur commence à taper
        fieldElement.addEventListener('input', function() {
            this.style.borderColor = '';
            this.classList.remove('error');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }, { once: true });
    }
}

// Nettoyer les erreurs d'une étape
function clearStepErrors(step) {
    let fieldsToClean = [];
    
    switch(step) {
        case 1:
            fieldsToClean = ['nom', 'prenoms', 'date_naissance', 'email'];
            break;
        case 2:
            fieldsToClean = ['filiere_id', 'photo'];
            break;
        case 3:
            // Pas de champs spécifiques pour l'étape 3
            break;
    }
    
    fieldsToClean.forEach(fieldId => {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const fieldElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
        
        if (fieldElement) {
            fieldElement.style.borderColor = '';
            fieldElement.classList.remove('error');
        }
    });
}

// Mettre à jour les données de confirmation (étape 3)
function updateConfirmationData() {
    if (currentStep === 3) {
        console.log('🔄 Mise à jour des données de confirmation');
        
        // Récupérer les valeurs du formulaire
        const nom = document.getElementById('nom').value.trim();
        const prenoms = document.getElementById('prenoms').value.trim();
        const dateNaissance = document.getElementById('date_naissance').value;
        const email = document.getElementById('email').value.trim();
        const filiereId = document.getElementById('filiere_id').value;
        const photoFile = document.getElementById('photo').files[0];
        
        // Mettre à jour l'affichage
        const confirmNomPrenoms = document.getElementById('confirm-nom-prenoms');
        const confirmDateNaissance = document.getElementById('confirm-date-naissance');
        const confirmEmail = document.getElementById('confirm-email');
        const confirmFiliere = document.getElementById('confirm-filiere');
        const confirmPhoto = document.getElementById('confirm-photo');
        
        if (confirmNomPrenoms) {
            confirmNomPrenoms.textContent = `${nom} ${prenoms}`;
        }
        
        if (confirmDateNaissance) {
            confirmDateNaissance.textContent = dateNaissance ? 
                new Date(dateNaissance).toLocaleDateString('fr-FR') : 
                'Non renseignée';
        }
        
        if (confirmEmail) {
            confirmEmail.textContent = email;
        }
        
        if (confirmFiliere) {
            const selectElement = document.getElementById('filiere_id');
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            confirmFiliere.textContent = selectedOption ? selectedOption.text : 'Non sélectionnée';
        }
        
        if (confirmPhoto) {
            confirmPhoto.textContent = photoFile ? photoFile.name : 'Aucune photo sélectionnée';
        }
    }
}

// Validation email (fonction utilitaire)
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Gestion du téléchargement de fichier (optionnel)
function initializeFileUpload() {
    const fileInput = document.getElementById('photo');
    const fileUploadArea = document.getElementById('file-upload-area');
    const filePreview = document.getElementById('file-preview');
    
    if (fileInput && fileUploadArea) {
        // Clic sur la zone de téléchargement
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Drag & Drop
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                fileInput.files = files;
                handleFileSelect(files[0]);
            }
        });
        
        // Changement de fichier
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }
}

// Gérer la sélection de fichier
function handleFileSelect(file) {
    console.log('📁 Fichier sélectionné:', file.name);
    
    const filePreview = document.getElementById('file-preview');
    
    if (filePreview) {
        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('Le fichier ne doit pas dépasser 5MB', 'error');
            return;
        }
        
        // Vérifier le type
        if (!file.type.startsWith('image/')) {
            showAlert('Veuillez sélectionner une image', 'error');
            return;
        }
        
        // Afficher la preview
        const reader = new FileReader();
        reader.onload = (e) => {
            filePreview.innerHTML = `
                <div class="file-preview-item">
                    <img src="${e.target.result}" alt="Preview" style="max-width: 150px; max-height: 150px; border-radius: 8px;">
                    <p>${file.name}</p>
                    <button type="button" onclick="clearFileSelection()" class="btn btn-secondary btn-small">
                        <i class="fas fa-times"></i> Supprimer
                    </button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}

// Supprimer la sélection de fichier
function clearFileSelection() {
    const fileInput = document.getElementById('photo');
    const filePreview = document.getElementById('file-preview');
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    if (filePreview) {
        filePreview.innerHTML = '';
    }
}

// Initialisation des fonctions de navigation
function initializeFormNavigation() {
    console.log('🚀 Initialisation de la navigation du formulaire');
    
    // Initialiser le téléchargement de fichier
    initializeFileUpload();
    
    // S'assurer que nous sommes à l'étape 1 au démarrage
    currentStep = 1;
    updateFormStep();
    
    console.log('✅ Navigation du formulaire initialisée');
}

// Ajouter à l'initialisation globale
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu pour s'assurer que tout est chargé
    setTimeout(() => {
        initializeFormNavigation();
    }, 100);
});

console.log('✅ Fonctions de navigation du formulaire chargées');