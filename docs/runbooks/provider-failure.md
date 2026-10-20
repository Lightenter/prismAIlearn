# Incident fournisseur IA

1. Vérifier les logs JSON et le fournisseur en échec.
2. Le routeur bascule automatiquement vers le fournisseur suivant.
3. Après trois erreurs dans une minute, le circuit est ouvert cinq minutes.
4. En multi-instance, consulter Redis/LiteLLM si activé.
