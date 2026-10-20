import test from 'node:test'; // Importe le runner de tests natif de Node.js sans dépendance supplémentaire.
import assert from 'node:assert/strict'; // Importe les assertions strictes nécessaires aux vérifications.
import { createApiServer } from './server.mjs'; // Importe la fabrique du serveur pour tester le même code que l’exécution réelle.

async function withServer(callback) { // Encapsule le démarrage et l’arrêt afin que chaque test reste isolé.
  const server = createApiServer(); // Construit un serveur neuf pour le scénario courant.
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); // Demande un port libre et attend que l’écoute soit prête.
  const address = server.address(); // Récupère l’adresse effectivement choisie par le système.
  const baseUrl = `http://127.0.0.1:${address.port}`; // Construit l’origine HTTP utilisée par les requêtes du test.
  try { // Protège le nettoyage même si une assertion échoue.
    return await callback(baseUrl); // Exécute le scénario avec l’URL du serveur temporaire.
  } finally { // Garantit la fermeture du serveur dans tous les cas.
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); // Arrête proprement le serveur et remonte toute erreur de fermeture.
  } // Termine la section de nettoyage.
} // Termine l’helper de test.

test('GET /health retourne un état opérationnel', async () => { // Vérifie le contrat de disponibilité minimal de l’API.
  await withServer(async (baseUrl) => { // Démarre un serveur isolé pour le scénario.
    const response = await fetch(`${baseUrl}/health`); // Appelle la route de santé via l’API fetch native.
    const body = await response.json(); // Décode la réponse JSON renvoyée par le serveur.
    assert.equal(response.status, 200); // Vérifie le statut HTTP de succès attendu.
    assert.deepEqual(body, { service: 'prismai-api', status: 'ok' }); // Vérifie le contrat fonctionnel exact de la réponse.
  }); // Termine le scénario isolé.
}); // Termine le test de santé.

test('une route inconnue retourne une erreur normalisée', async () => { // Vérifie que le serveur ne simule pas des fonctionnalités absentes.
  await withServer(async (baseUrl) => { // Démarre un serveur isolé pour le scénario.
    const response = await fetch(`${baseUrl}/not-implemented`); // Appelle une route qui ne fait pas partie du socle.
    const body = await response.json(); // Décode l’erreur JSON renvoyée par le serveur.
    assert.equal(response.status, 404); // Vérifie le statut d’absence de route attendu.
    assert.deepEqual(body, { error: 'not_found' }); // Vérifie le format d’erreur stable annoncé par le socle.
  }); // Termine le scénario isolé.
}); // Termine le test de route inconnue.
