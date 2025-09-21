using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http;
using System.Net;
using System.Net.Http;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Configure SSL validation for local development with Cosmos DB emulator
        if (Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT") != "Production")
        {
            // Configure HttpClient factory to bypass SSL validation for localhost
            services.Configure<HttpClientFactoryOptions>("", options =>
            {
                options.HttpMessageHandlerBuilderActions.Add(builder =>
                {
                    if (builder.PrimaryHandler is HttpClientHandler handler)
                    {
                        handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) =>
                        {
                            // Allow localhost certificates (Cosmos DB emulator)
                            if (message.RequestUri?.Host == "localhost" || message.RequestUri?.Host == "127.0.0.1")
                            {
                                return true;
                            }
                            
                            // Check certificate subject for localhost
                            if (cert != null && (cert.Subject.Contains("CN=localhost") || cert.Subject.Contains("CN=127.0.0.1")))
                            {
                                return true;
                            }
                            
                            return errors == SslPolicyErrors.None;
                        };
                    }
                });
            });
            
            // Also set the legacy callback as fallback
            ServicePointManager.ServerCertificateValidationCallback += (sender, cert, chain, errors) =>
            {
                if (sender is HttpWebRequest request && 
                    (request.RequestUri?.Host == "localhost" || request.RequestUri?.Host == "127.0.0.1"))
                {
                    return true;
                }
                
                if (cert != null && (cert.Subject.Contains("CN=localhost") || cert.Subject.Contains("CN=127.0.0.1")))
                {
                    return true;
                }
                
                return errors == SslPolicyErrors.None;
            };
        }
        
        // Add other services as needed
        services.AddHttpClient();
    })
    .Build();

host.Run();

