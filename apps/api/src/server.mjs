import { createServer as createHttpServer } from 'node:http'; // Importe le serveur HTTP natif afin de garder le socle sans dépendance externe.

const DEFAULT_PORT = 3001; // Définit le port local par défaut pour rendre le démarrage reproductible.

export function createApiServer() { // Expose une fabrique testable pour isoler la création du serveur.
  return createHttpServer((request, response) => { // Crée le serveur HTTP et traite chaque requête entrante.
    if (request.method === 'GET' && request.url === '/health') { // Répond uniquement à la route de santé explicitement définie.
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }); // Retourne un statut et un type de contenu déterministes.
      response.end(JSON.stringify({ service: 'prismai-api', status: 'ok' })); // Fournit une réponse minimale exploitable par un contrôle de disponibilité.
      return; // Arrête le traitement pour empêcher une seconde réponse.
    } // Ferme la branche de traitement de la route de santé.

    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' }); // Signale explicitement qu’aucune autre route n’est encore implémentée.
    response.end(JSON.stringify({ error: 'not_found' })); // Retourne une erreur normalisée minimale pour les routes inconnues.
  }); // Termine la définition du serveur HTTP.
} // Termine la fabrique du serveur API.

const isDirectExecution = process.argv[1]?.endsWith('apps/api/src/server.mjs'); // Détecte si ce module est lancé directement ou importé par un test.

if (isDirectExecution) { // Démarre le serveur uniquement lors d’une exécution directe.
  const port = Number(process.env.PRISMAI_API_PORT ?? DEFAULT_PORT); // Lit le port depuis l’environnement sans accepter de valeur secrète.
  const server = createApiServer(); // Construit l’instance du serveur avec la fabrique testable.
  server.listen(port, '127.0.0.1', () => { // Écoute localement pour éviter une exposition réseau involontaire.
    console.log(`PrismAI API listening on http://127.0.0.1:${port}`); // Signale l’adresse locale utilisée par le développeur.
  }); // Termine le démarrage du serveur.
} // Termine la branche d’exécution directe.
