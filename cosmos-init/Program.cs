using Microsoft.Azure.Cosmos;
using System.Net;

namespace CosmosInit;

class Program
{
    private const string CosmosEndpoint = "https://cosmos-emulator:8081";
    private const string CosmosKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
    private const string DatabaseName = "choosinator";

    static async Task Main()
    {
        Console.WriteLine("🚀 Initializing Cosmos DB Emulator...");

        var conn = Environment.GetEnvironmentVariable("COSMOS_CONNECTION_STRING");
        CosmosClient client;

        var opts = new CosmosClientOptions {
        ConnectionMode = ConnectionMode.Gateway,
        RequestTimeout = TimeSpan.FromSeconds(120),
        HttpClientFactory = () => new HttpClient(new HttpClientHandler {
            ServerCertificateCustomValidationCallback = (_, __, ___, ____) => true
        })
        };

        if (!string.IsNullOrWhiteSpace(conn))
        {
            client = new CosmosClient(conn, opts);
        }
        else
        {
            var endpoint = Environment.GetEnvironmentVariable("COSMOS_ENDPOINT")?.Trim() ?? "https://localhost:8081";
            var key = Environment.GetEnvironmentVariable("COSMOS_KEY")?.Trim()
                    ?? "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
            client = new CosmosClient(endpoint, key, opts);
        }

        // simple retry helper
        static async Task<T> RetryAsync<T>(Func<Task<T>> action, string op, int maxRetries = 8, int initialDelayMs = 500)
        {
            var delay = initialDelayMs;
            for (int attempt = 1; ; attempt++)
            {
                try
                {
                    return await action();
                }
                catch (CosmosException ex) 
                    when (ex.StatusCode == HttpStatusCode.ServiceUnavailable ||   // 503
                    ex.StatusCode == HttpStatusCode.RequestTimeout ||
                    (int)ex.StatusCode == 449                                // Retry With (rare)
                    )
                {
                    Console.WriteLine($"⏳ {op} transient failure ({ex.StatusCode}{(ex.SubStatusCode != 0 ? $"/{ex.SubStatusCode}" : "")}), attempt {attempt}/{maxRetries}...");
                    if (attempt >= maxRetries) throw;
                }
                catch (TaskCanceledException)
                {
                    Console.WriteLine($"⏳ {op} timed out, attempt {attempt}/{maxRetries}...");
                    if (attempt >= maxRetries) throw;
                }

                await Task.Delay(delay);
                delay = Math.Min(delay * 2, 8000); // exponential backoff up to 8s
            }
        }

        try
        {
            // Database
            Console.WriteLine($"🗄️  Ensuring database '{DatabaseName}'...");
            var dbResponse = await RetryAsync(
                () => client.CreateDatabaseIfNotExistsAsync(
                    DatabaseName,
                    ThroughputProperties.CreateManualThroughput(400) // <-- add this
                ),
                "CreateDatabaseIfNotExists");
            var database = dbResponse.Database;
            Console.WriteLine("✅ Database ready");

            // Containers to create
            var containers = new[]
            {
                new ContainerProperties("pollVote", "/pollId"),
                new ContainerProperties("leases",   "/id"),     // used by Change Feed Processor
                new ContainerProperties("poll",     "/id"),
                new ContainerProperties("user",     "/id"),
                new ContainerProperties("optionsList", "/userId"),
                new ContainerProperties("pollPresence", "/id")
            };

            foreach (var props in containers)
            {
                Console.WriteLine($"📦 Ensuring container '{props.Id}'...");
                await RetryAsync(
                    () => database.CreateContainerIfNotExistsAsync(props),
                    $"CreateContainerIfNotExists({props.Id})");
                Console.WriteLine($"✅ Container '{props.Id}' ready");
            }

            Console.WriteLine("🎉 Cosmos DB initialization complete!");
            Console.WriteLine("📋 Containers: " + string.Join(", ", containers.Select(c => c.Id)));
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error initializing Cosmos DB:");
            Console.WriteLine(ex.ToString());
            Environment.Exit(1);
        }
    }
}
