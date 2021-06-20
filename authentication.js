const CASAuthentication = require('cas-authentication-user');
const { env } = require('../Helpers');

const {
  hostname, casUrl, devMode, sessionName, sessionInfo,
} = env;

module.exports = new CASAuthentication({
  cas_url: casUrl,
  service_url: `https://${hostname}`,
  cas_version: '3.0',
  renew: false,
  is_dev_mode: devMode,
  dev_mode_user: 'test_user',
  dev_mode_info: {},
  session_name: sessionName,
  session_info: sessionInfo,
  destroy_session: false,
});
