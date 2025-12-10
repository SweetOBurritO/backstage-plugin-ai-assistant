import { AuthService, CacheService } from '@backstage/backend-plugin-api';
import { UserEntity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';

export const getUser = async (
  cache: CacheService,
  userEntityRef: string,
  catalog: CatalogService,
  auth: AuthService,
): Promise<UserEntity | undefined> => {
  const cached = await cache.get(userEntityRef);

  if (cached) {
    return JSON.parse(String(cached));
  }

  const credentials = await auth.getOwnServiceCredentials();

  const user = (await catalog.getEntityByRef(userEntityRef, {
    credentials,
  })) as UserEntity | undefined;
  await cache.set(userEntityRef, JSON.stringify(user));

  return user;
};
