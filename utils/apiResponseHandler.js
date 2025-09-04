/**
 * API响应处理器 - 用于处理不同版本API的兼容性问题
 * 提供防御性编程和降级处理机制
 */

/**
 * API响应字段验证器
 */
class ApiResponseValidator {
  constructor() {
    // 定义不同API版本的字段映射
    this.fieldMappings = {
      // 常见的字段变体映射
      content: ['content', 'text', 'message', 'response', 'result'],
      id: ['id', 'messageId', 'requestId', 'uuid'],
      timestamp: ['timestamp', 'created_at', 'time', 'date'],
      model: ['model', 'model_name', 'modelName', 'version'],
      usage: ['usage', 'token_usage', 'tokenUsage', 'consumption'],
      error: ['error', 'error_message', 'errorMessage', 'message']
    };
    
    // 默认值定义
    this.defaultValues = {
      content: '',
      id: this.generateFallbackId(),
      timestamp: new Date().toISOString(),
      model: 'unknown-model',
      usage: { total_tokens: 0 },
      error: null
    };
  }

  /**
   * 生成备用ID
   */
  generateFallbackId() {
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证并标准化API响应
   * @param {Object} response - 原始API响应
   * @param {Array} requiredFields - 必需字段列表
   * @returns {Object} 标准化后的响应对象
   */
  validateAndNormalize(response, requiredFields = ['content']) {
    if (!response || typeof response !== 'object') {
      console.warn('[API Handler] Invalid response object, using fallback');
      return this.createFallbackResponse();
    }

    const normalizedResponse = {
      _original: response, // 保留原始响应用于调试
      _validation: {
        timestamp: new Date().toISOString(),
        issues: []
      }
    };

    // 处理每个必需字段
    for (const field of requiredFields) {
      const value = this.extractField(response, field);
      if (value !== null) {
        normalizedResponse[field] = value;
      } else {
        normalizedResponse[field] = this.defaultValues[field];
        normalizedResponse._validation.issues.push(`Missing field: ${field}`);
      }
    }

    // 处理可选字段
    const optionalFields = ['id', 'timestamp', 'model', 'usage', 'error'];
    for (const field of optionalFields) {
      if (!normalizedResponse[field]) {
        const value = this.extractField(response, field);
        normalizedResponse[field] = value !== null ? value : this.defaultValues[field];
      }
    }

    return normalizedResponse;
  }

  /**
   * 从响应中提取指定字段的值
   * @param {Object} response - API响应对象
   * @param {string} fieldName - 字段名
   * @returns {*} 字段值或null
   */
  extractField(response, fieldName) {
    const possibleKeys = this.fieldMappings[fieldName] || [fieldName];
    
    for (const key of possibleKeys) {
      if (this.hasNestedProperty(response, key)) {
        return this.getNestedProperty(response, key);
      }
    }
    
    return null;
  }

  /**
   * 检查对象是否有嵌套属性
   * @param {Object} obj - 目标对象
   * @param {string} path - 属性路径，支持点记法如 'data.message'
   * @returns {boolean}
   */
  hasNestedProperty(obj, path) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取嵌套属性值
   * @param {Object} obj - 目标对象
   * @param {string} path - 属性路径
   * @returns {*}
   */
  getNestedProperty(obj, path) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      current = current[key];
    }
    
    return current;
  }

  /**
   * 创建备用响应
   * @returns {Object}
   */
  createFallbackResponse() {
    return {
      content: '抱歉，API响应处理出现问题，请稍后重试。',
      id: this.generateFallbackId(),
      timestamp: new Date().toISOString(),
      model: 'fallback-model',
      usage: { total_tokens: 0 },
      error: 'API compatibility issue detected',
      _validation: {
        timestamp: new Date().toISOString(),
        issues: ['Complete fallback response generated']
      }
    };
  }
}

/**
 * VuePress插件API处理器
 */
class VuePressApiHandler {
  constructor() {
    this.validator = new ApiResponseValidator();
    this.errorCount = 0;
    this.maxErrors = 5; // 最大错误次数
  }

  /**
   * 处理AI助手API响应
   * @param {Object} apiResponse - 原始API响应
   * @param {Object} options - 处理选项
   * @returns {Object} 处理后的响应
   */
  handleApiResponse(apiResponse, options = {}) {
    const {
      requiredFields = ['content'],
      enableLogging = true,
      enableFallback = true
    } = options;

    try {
      // 验证和标准化响应
      const normalizedResponse = this.validator.validateAndNormalize(
        apiResponse, 
        requiredFields
      );

      // 检查是否有验证问题
      if (normalizedResponse._validation.issues.length > 0) {
        if (enableLogging) {
          console.warn('[VuePress API Handler] Response validation issues:', 
            normalizedResponse._validation.issues);
        }
        
        this.errorCount++;
        
        // 如果错误次数过多，可能需要特殊处理
        if (this.errorCount > this.maxErrors) {
          console.error('[VuePress API Handler] Too many API compatibility issues detected');
        }
      } else {
        // 重置错误计数器
        this.errorCount = 0;
      }

      return normalizedResponse;

    } catch (error) {
      console.error('[VuePress API Handler] Failed to process API response:', error);
      
      if (enableFallback) {
        return this.validator.createFallbackResponse();
      } else {
        throw error;
      }
    }
  }

  /**
   * 为VuePress插件创建安全的API包装器
   * @param {Function} apiCall - 原始API调用函数
   * @param {Object} options - 配置选项
   * @returns {Function} 包装后的API调用函数
   */
  createSafeApiWrapper(apiCall, options = {}) {
    return async (...args) => {
      try {
        const rawResponse = await apiCall(...args);
        return this.handleApiResponse(rawResponse, options);
      } catch (error) {
        console.error('[VuePress API Handler] API call failed:', error);
        
        if (options.enableFallback !== false) {
          return this.validator.createFallbackResponse();
        } else {
          throw error;
        }
      }
    };
  }

  /**
   * 生成错误报告
   * @returns {Object} 错误统计报告
   */
  generateErrorReport() {
    return {
      timestamp: new Date().toISOString(),
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      status: this.errorCount > this.maxErrors ? 'critical' : 'normal',
      recommendations: this.getRecommendations()
    };
  }

  /**
   * 获取兼容性建议
   * @returns {Array} 建议列表
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.errorCount > 0) {
      recommendations.push('检查API响应格式是否发生变化');
      recommendations.push('考虑更新字段映射配置');
    }
    
    if (this.errorCount > this.maxErrors) {
      recommendations.push('建议联系API提供方确认版本兼容性');
      recommendations.push('考虑实施API版本检测机制');
    }
    
    return recommendations;
  }
}

module.exports = {
  ApiResponseValidator,
  VuePressApiHandler
};