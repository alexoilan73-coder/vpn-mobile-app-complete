// cloudflare-protection.js
const axios = require('axios');

class CloudflareProtection {
  constructor(zoneId, apiToken) {
    this.zoneId = zoneId;
    this.apiToken = apiToken;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  // Включить DDoS Protection
  async enableDDoSProtection() {
    try {
      const response = await axios.patch(
        `${this.baseURL}/zones/${this.zoneId}/settings/security_level`,
        { value: 'high' },
        { headers: { Authorization: `Bearer ${this.apiToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка включения защиты:', error);
    }
  }

  // Создать WAF Rule
  async createWAFRule() {
    const rule = {
      description: 'Block DDoS patterns',
      expression: '(cf.bot_management.score < 30)',
      action: 'block',
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/zones/${this.zoneId}/firewall/rules`,
        rule,
        { headers: { Authorization: `Bearer ${this.apiToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка создания правила:', error);
    }
  }
}

module.exports = CloudflareProtection;