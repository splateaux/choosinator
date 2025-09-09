import { CosmosClient, Database, Container } from "@azure/cosmos";

// Azure Cosmos DB client for local development and production
export class AzureDatabase {
  private client: CosmosClient;
  private database: Database;
  private containers = new Map<string, Container>();

  constructor() {
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "COSMOS_CONNECTION_STRING environment variable is required",
      );
    }

    this.client = new CosmosClient(connectionString);
    this.database = this.client.database("choosinator");
  }

  async getContainer(name: string): Promise<Container> {
    if (!this.containers.has(name)) {
      const container = this.database.container(name);
      this.containers.set(name, container);
    }
    return this.containers.get(name)!;
  }

  // Generic query method
  async query<T>(
    containerName: string,
    query: string,
    parameters: { name: string; value: unknown }[] = [],
  ): Promise<T[]> {
    const container = await this.getContainer(containerName);
    const querySpec = {
      query,
      parameters,
    };

    const { resources } = await container.items
      .query<T>(querySpec, { enableCrossPartitionQuery: true })
      .fetchAll();
    return resources;
  }

  // Generic get method
  async get<T>(
    containerName: string,
    id: string,
    partitionKey?: string,
  ): Promise<T | null> {
    try {
      const container = await this.getContainer(containerName);
      const { resource } = await container
        .item(id, partitionKey || id)
        .read<T>();
      return resource || null;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  // Generic put/upsert method
  async put<T>(containerName: string, item: T): Promise<T> {
    const container = await this.getContainer(containerName);
    const { resource } = await container.items.upsert<T>(item);
    return resource!;
  }

  // Generic delete method
  async delete(
    containerName: string,
    id: string,
    partitionKey?: string,
  ): Promise<void> {
    const container = await this.getContainer(containerName);
    await container.item(id, partitionKey || id).delete();
  }

  // Get all items from a container
  async getAll<T>(containerName: string): Promise<T[]> {
    const container = await this.getContainer(containerName);
    const { resources } = await container.items.readAll<T>().fetchAll();
    return resources;
  }
}

// Singleton instance
let dbInstance: AzureDatabase | null = null;

export function getAzureDatabase(): AzureDatabase {
  if (!dbInstance) {
    dbInstance = new AzureDatabase();
  }
  return dbInstance;
}

// For development/testing, we can create a mock version
export function createMockAzureDatabase(): AzureDatabase {
  return {
    getContainer: async () => ({}) as Container,
    query: async () => [],
    get: async () => null,
    put: async (item: unknown) => item,
    delete: async () => {
      /* Mock implementation */
    },
    getAll: async () => [],
  } as AzureDatabase;
}
