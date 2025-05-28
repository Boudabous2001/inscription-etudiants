echo "🧪 Test de l'API..."
echo "Test health check:"
curl -X GET http://localhost:3001/api/health
echo -e "\n\nTest récupération filières:"
curl -X GET http://localhost:3001/api/filieres

echo -e "\n\nTest inscription étudiant:"
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenoms": "Jean",
    "date_naissance": "2000-05-15",
    "email": "jean.dupont@test.com",
    "filiere_id": 1
  }'