/**
 * 区域管理器
 * 处理用户-区域绑定、多租户数据隔离
 */

import { REGION_CONFIG } from '../config';
import { Logger } from './logger';

export interface Region {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  path: string; // 如: "河北省/石家庄市/正定县"
}

export interface UserRegionBinding {
  userId: string;
  regionId: string;
  boundAt: number;
}

export class RegionManager {
  private logger: Logger;
  private regionCache: Map<string, Region>;
  private userBindingCache: Map<string, UserRegionBinding>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.regionCache = new Map();
    this.userBindingCache = new Map();
    this.initializeRegions();
  }

  /**
   * 初始化区域数据
   * 实际应该从数据库或配置加载
   */
  private initializeRegions(): void {
    // 示例：河北省及其下级区域
    const sampleRegions: Region[] = [
      { id: '130000', name: '河北省', parentId: null, level: 1, path: '河北省' },
      { id: '130100', name: '石家庄市', parentId: '130000', level: 2, path: '河北省/石家庄市' },
      { id: '130102', name: '长安区', parentId: '130100', level: 3, path: '河北省/石家庄市/长安区' },
      { id: '130103', name: '桥西区', parentId: '130100', level: 3, path: '河北省/石家庄市/桥西区' },
      // 更多区域...
    ];

    for (const region of sampleRegions) {
      this.regionCache.set(region.id, region);
    }
  }

  /**
   * 根据用户ID获取区域
   */
  async getRegionByUserId(userId: string): Promise<string | undefined> {
    const binding = this.userBindingCache.get(userId);
    if (binding) {
      return binding.regionId;
    }

    // 尝试从飞书组织架构获取
    // 实际应该调用飞书API: GET /contact/v3/users/{user_id}
    // 这里简化处理，返回默认区域
    return undefined;
  }

  /**
   * 绑定用户区域
   */
  async bindUserRegion(userId: string, regionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // 验证区域是否存在
    const region = this.regionCache.get(regionId);
    if (!region) {
      return {
        success: false,
        error: `区域不存在: ${regionId}`,
      };
    }

    // 保存绑定关系
    const binding: UserRegionBinding = {
      userId,
      regionId,
      boundAt: Date.now(),
    };

    this.userBindingCache.set(userId, binding);
    
    this.logger.logRegionOperation(userId, regionId, 'bind');

    return { success: true };
  }

  /**
   * 解绑用户区域
   */
  async unbindUserRegion(userId: string): Promise<{
    success: boolean;
  }> {
    const binding = this.userBindingCache.get(userId);
    
    if (binding) {
      this.logger.logRegionOperation(userId, binding.regionId, 'unbind');
      this.userBindingCache.delete(userId);
    }

    return { success: true };
  }

  /**
   * 获取区域信息
   */
  getRegion(regionId: string): Region | undefined {
    return this.regionCache.get(regionId);
  }

  /**
   * 获取子区域列表
   */
  getChildRegions(regionId: string): Region[] {
    return Array.from(this.regionCache.values()).filter(
      r => r.parentId === regionId
    );
  }

  /**
   * 获取区域路径（包含所有上级）
   */
  getRegionPath(regionId: string): string[] {
    const path: string[] = [];
    let currentRegion = this.regionCache.get(regionId);

    while (currentRegion) {
      path.unshift(currentRegion.name);
      currentRegion = currentRegion.parentId
        ? this.regionCache.get(currentRegion.parentId)
        : undefined;
    }

    return path;
  }

  /**
   * 检查用户是否有权限访问指定区域
   */
  canAccessRegion(userId: string, targetRegionId: string): boolean {
    const binding = this.userBindingCache.get(userId);
    if (!binding) return false;

    const userRegion = this.regionCache.get(binding.regionId);
    const targetRegion = this.regionCache.get(targetRegionId);

    if (!userRegion || !targetRegion) return false;

    // 用户只能访问自己所在区域及下级区域
    // 检查目标区域是否在用户区域的路径下
    const targetPath = this.getRegionPath(targetRegionId);
    const userPath = this.getRegionPath(userRegion.id);

    // 检查目标路径是否以用户路径开头
    return targetPath.slice(0, userPath.length).join('/') === userPath.join('/');
  }

  /**
   * 获取用户可访问的所有区域ID
   */
  getAccessibleRegionIds(userId: string): string[] {
    const binding = this.userBindingCache.get(userId);
    if (!binding) return [];

    const userRegion = this.regionCache.get(binding.regionId);
    if (!userRegion) return [];

    // 返回用户区域及所有下级区域
    const accessibleIds = [binding.regionId];

    // 递归获取所有子区域
    const collectChildIds = (parentId: string) => {
      const children = this.getChildRegions(parentId);
      for (const child of children) {
        accessibleIds.push(child.id);
        collectChildIds(child.id);
      }
    };

    collectChildIds(binding.regionId);

    return accessibleIds;
  }

  /**
   * 添加新区域
   */
  addRegion(region: Region): void {
    this.regionCache.set(region.id, region);
    this.logger.info('新增区域', {
      metadata: { regionId: region.id, name: region.name, level: region.level }
    });
  }

  /**
   * 更新区域
   */
  updateRegion(regionId: string, updates: Partial<Region>): boolean {
    const region = this.regionCache.get(regionId);
    if (!region) return false;

    const updatedRegion = { ...region, ...updates };
    this.regionCache.set(regionId, updatedRegion);

    this.logger.info('更新区域', {
      metadata: { regionId, updates }
    });

    return true;
  }

  /**
   * 获取区域层级
   */
  getRegionLevel(regionId: string): number | undefined {
    return this.regionCache.get(regionId)?.level;
  }

  /**
   * 获取省份列表
   */
  getProvinces(): Region[] {
    return Array.from(this.regionCache.values()).filter(r => r.level === REGION_CONFIG.levels.province);
  }

  /**
   * 获取数据隔离的SQL条件
   */
  getIsolationFilter(userId: string): string | null {
    const accessibleIds = this.getAccessibleRegionIds(userId);
    if (accessibleIds.length === 0) return null;
    
    return `region_id IN (${accessibleIds.map(id => `'${id}'`).join(',')})`;
  }

  /**
   * 获取用户绑定信息
   */
  getUserBinding(userId: string): UserRegionBinding | undefined {
    return this.userBindingCache.get(userId);
  }
}

export default RegionManager;
