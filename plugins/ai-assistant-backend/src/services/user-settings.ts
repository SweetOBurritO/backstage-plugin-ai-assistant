import {
  BackstageCredentials,
  DatabaseService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { UserSettingsStore } from '../database/user-settings-store';

type CreateMcpServiceOptions = {
  userInfo: UserInfoService;
  database: DatabaseService;
};

export type UserSettingsService = {
  getSettingsForType: (
    credentials: BackstageCredentials,
    type: string,
  ) => Promise<Record<string, unknown>>;
  setSettingsForType: (
    credentials: BackstageCredentials,
    type: string,
    settings: Record<string, unknown>,
  ) => Promise<void>;
  deleteSettingsForType: (
    credentials: BackstageCredentials,
    type: string,
  ) => Promise<void>;
};

export const createUserSettingsService = async ({
  userInfo,
  database,
}: CreateMcpServiceOptions): Promise<UserSettingsService> => {
  const userSettingsStore = await UserSettingsStore.fromConfig({ database });

  const getSettingsForType: UserSettingsService['getSettingsForType'] = async (
    credentials,
    type,
  ) => {
    const { userEntityRef } = await userInfo.getUserInfo(credentials);
    const settings = await userSettingsStore.getUserSettingsByType(
      userEntityRef,
      type,
    );

    return settings ?? {};
  };

  const setSettingsForType: UserSettingsService['setSettingsForType'] = async (
    credentials,
    type,
    settings,
  ) => {
    const { userEntityRef } = await userInfo.getUserInfo(credentials);
    await userSettingsStore.setUserSettings(userEntityRef, type, settings);
  };

  const deleteSettingsForType: UserSettingsService['deleteSettingsForType'] =
    async (credentials, type) => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      await userSettingsStore.deleteUserSettings(userEntityRef, type);
    };

  return {
    getSettingsForType,
    setSettingsForType,
    deleteSettingsForType,
  };
};
