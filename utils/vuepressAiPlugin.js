/**
 * VuePress AI交互插件示例
 * 演示如何使用API响应处理器来确保兼容性
 */

const { VuePressApiHandler } = require('./apiResponseHandler');

/**
 * AI交互插件类
 */
class VuePressAiPlugin {
  constructor(options = {}) {
    this.apiHandler = new VuePressApiHandler();
    this.options = {
      apiEndpoint: options.apiEndpoint || '/api/ai/chat',
      timeout: options.timeout || 30000,
      retryCount: options.retryCount || 3,
      enableDebug: options.enableDebug || false,
      ...options
    };
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      compatibilityIssues: 0
    };
  }

  /**
   * 发送AI请求的安全包装方法
   * @param {string} message - 用户消息
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 标准化的响应对象
   */
  async sendMessage(message, context = {}) {
    this.stats.totalRequests++;
    
    try {
      // 模拟API调用 (在实际使用中，这里会是真实的API调用)
      const rawApiResponse = await this.makeApiCall(message, context);
      
      // 使用API处理器确保响应格式兼容性
      const safeResponse = this.apiHandler.handleApiResponse(rawApiResponse, {
        requiredFields: ['content', 'id'],
        enableLogging: this.options.enableDebug,
        enableFallback: true
      });

      // 检查是否有兼容性问题
      if (safeResponse._validation.issues.length > 0) {
        this.stats.compatibilityIssues++;
        
        if (this.options.enableDebug) {
          console.log('[VuePress AI Plugin] Compatibility issues detected:', 
            safeResponse._validation.issues);
        }
      }

      this.stats.successfulRequests++;
      return safeResponse;

    } catch (error) {
      this.stats.failedRequests++;
      console.error('[VuePress AI Plugin] Request failed:', error);
      
      // 返回降级响应
      return this.apiHandler.validator.createFallbackResponse();
    }
  }

  /**
   * 模拟API调用 (实际项目中替换为真实的API调用)
   * @param {string} message - 消息内容
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} API响应
   */
  async makeApiCall(message, context) {
    // 这里模拟不同版本API可能返回的不同格式
    const apiVersions = [
      // 版本1: 标准格式
      {
        content: `AI回复: ${message}`,
        id: 'msg_123456',
        timestamp: new Date().toISOString(),
        model: 'ai-model-v1',
        usage: { total_tokens: 150 }
      },
      
      // 版本2: 字段名不同
      {
        text: `AI回复: ${message}`, // content -> text
        messageId: 'msg_789012', // id -> messageId
        created_at: new Date().toISOString(), // timestamp -> created_at
        model_name: 'ai-model-v2', // model -> model_name
        token_usage: { total: 150 } // usage -> token_usage
      },
      
      // 版本3: 嵌套结构
      {
        data: {
          message: `AI回复: ${message}`,
          metadata: {
            id: 'msg_345678',
            timestamp: new Date().toISOString(),
            model: 'ai-model-v3'
          }
        },
        usage: { total_tokens: 150 }
      },
      
      // 版本4: 缺少某些字段 (模拟兼容性问题)
      {
        response: `AI回复: ${message}`,
        // 缺少 id 和 timestamp
        model: 'ai-model-v4'
        // 缺少 usage
      }
    ];

    // 随机选择一个版本来模拟不同的API响应格式
    const randomVersion = apiVersions[Math.floor(Math.random() * apiVersions.length)];
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return randomVersion;
  }

  /**
   * 获取插件统计信息
   * @returns {Object} 统计数据
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
      compatibilityRate: this.stats.totalRequests > 0 ? 
        (this.stats.compatibilityIssues / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
      errorReport: this.apiHandler.generateErrorReport()
    };
  }

  /**
   * VuePress插件安装方法
   * @param {Object} Vue - Vue实例
   * @param {Object} options - 插件选项
   */
  install(Vue, options = {}) {
    // 创建全局混入
    Vue.mixin({
      data() {
        return {
          aiPlugin: this
        };
      },
      
      methods: {
        /**
         * 发送AI消息的Vue方法
         * @param {string} message - 消息内容
         * @param {Object} context - 上下文
         * @returns {Promise<Object>} 响应数据
         */
        async $sendAiMessage(message, context = {}) {
          try {
            const response = await this.aiPlugin.sendMessage(message, {
              ...context,
              page: this.$page,
              route: this.$route
            });
            
            return response;
          } catch (error) {
            console.error('[VuePress AI Plugin] Vue method failed:', error);
            return this.aiPlugin.apiHandler.validator.createFallbackResponse();
          }
        }
      }
    });

    // 添加全局属性
    Vue.prototype.$aiStats = () => this.getStats();
  }
}

/**
 * VuePress插件工厂函数
 * @param {Object} options - 插件配置
 * @returns {Function} VuePress插件函数
 */
function createVuePressAiPlugin(options = {}) {
  const plugin = new VuePressAiPlugin(options);
  
  return (Vue, pluginOptions) => {
    plugin.install(Vue, { ...options, ...pluginOptions });
  };
}

module.exports = {
  VuePressAiPlugin,
  createVuePressAiPlugin
};