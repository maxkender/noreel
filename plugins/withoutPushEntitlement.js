const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Retire `aps-environment` des entitlements.
 *
 * expo-notifications l'ajoute systematiquement, mais NoReel n'envoie que des
 * notifications LOCALES : elles ne demandent aucune capacite Push. Or le
 * profil de provisioning de l'app n'a pas cette capacite, et la synchro des
 * capacites est desactivee cote EAS (`EXPO_NO_CAPABILITY_SYNC=1`, parce que
 * Apple refuse family-controls par l'API). Laisser la cle ferait echouer la
 * signature — le meme echec muet que les sept builds de septembre.
 *
 * Le jour ou on voudra du push distant : enlever ce plugin ET cocher Push
 * Notifications sur l'App ID dans le portail Apple.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
