/**
 * 飞书开放平台API封装
 * 提供统一的飞书API调用能力
 */

import { FEISHU_CONFIG } from './config';

interface FeishuResponse<T = any> {
  code: number;
  msg: string;
  data?: T;
}

interface TokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire: number;
}

export class FeishuAPI {
  private appId: string;
  private appSecret: string;
  private tenantToken?: string;
  private tokenExpireTime?: number;

  constructor(appId?: string, appSecret?: string) {
    this.appId = appId || FEISHU_CONFIG.appId;
    this.appSecret = appSecret || FEISHU_CONFIG.appSecret;
  }

  /**
   * 获取Tenant Access Token
   */
  async getTenantToken(): Promise<string> {
    // 检查缓存的token是否有效
    if (this.tenantToken && this.tokenExpireTime && Date.now() < this.tokenExpireTime - 60000) {
      return this.tenantToken;
    }

    const response = await this.request<TokenResponse>('/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      body: {
        app_id: this.appId,
        app_secret: this.appSecret,
      },
    });

    if (response.code !== 0 || !response.tenant_access_token) {
      throw new Error(`获取Token失败: ${response.msg}`);
    }

    this.tenantToken = response.tenant_access_token;
    this.tokenExpireTime = Date.now() + (response.expire * 1000);

    return this.tenantToken;
  }

  /**
   * 发送消息
   */
  async sendMessage(receiveIdType: 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id',
                    receiveId: string, msgType: string, content: any): Promise<FeishuResponse<{ message_id: string }>> {
    const token = await this.getTenantToken();

    return this.request('/im/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: {
        receive_id: receiveId,
        receive_id_type: receiveIdType,
        msg_type: msgType,
        content: typeof content === 'string' ? content : JSON.stringify(content),
      },
    });
  }

  /**
   * 获取消息详情
   */
  async getMessage(messageId: string): Promise<FeishuResponse> {
    const token = await this.getTenantToken();

    return this.request(`/im/v1/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  /**
   * 上传文件
   */
  async uploadFile(fileType: 'file' | 'image' | 'audio' | 'video',
                   fileName: string, fileSize: number, filePath: string): Promise<FeishuResponse<{ file_key: string }>> {
    const token = await this.getTenantToken();

    // 实际应该使用multipart/form-data上传
    // 这里简化处理
    return this.request('/im/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: {
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
      },
    });
  }

  /**
   * 下载文件
   */
  async downloadFile(fileKey: string): Promise<Buffer> {
    const token = await this.getTenantToken();

    const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/files/${fileKey}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`文件下载失败: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }

  /**
   * 创建云文档
   */
  async createDoc(title: string): Promise<FeishuResponse<{ document: { document_id: string } }>> {
    const token = await this.getTenantToken();

    return this.request('/docx/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: {
        title,
      },
    });
  }

  /**
   * 批量获取用户信息
   */
  async getUsers(userIds: string[]): Promise<FeishuResponse<{ items: any[] }>> {
    const token = await this.getTenantToken();

    return this.request('/contact/v3/users/batch_get_id', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: {
        user_ids: userIds,
      },
    });
  }

  /**
   * 获取用户所属部门
   */
  async getUserDepartment(userId: string): Promise<FeishuResponse<{ department_id: string }>> {
    const token = await this.getTenantToken();

    return this.request(`/contact/v3/users/${userId}?user_id_type=open_id`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  /**
   * 发送卡片消息
   */
  async sendCard(receiveIdType: 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id',
                 receiveId: string, cardContent: any): Promise<FeishuResponse<{ message_id: string }>> {
    return this.sendMessage(receiveIdType, receiveId, 'interactive', {
      type: 'template',
      data: {
        template_id: 'fixed_card_id', // 固定卡片ID
        template_variable: cardContent,
      },
    });
  }

  /**
   * 通用请求方法
   */
  private async request<T = any>(path: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  } = {}): Promise<T> {
    const baseUrl = 'https://open.feishu.cn/open-apis';
    const method = options.method || 'GET';
    
    let url = `${baseUrl}${path}`;
    
    // 添加查询参数
    if (options.query) {
      const params = new URLSearchParams(options.query);
      url += `?${params.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return data as T;
  }
}

// 导出单例
export const feishuAPI = new FeishuAPI();

export default FeishuAPI;
