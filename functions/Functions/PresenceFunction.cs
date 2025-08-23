using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Extensions.CosmosDB;
using Microsoft.Azure.Cosmos;
using System.Net;
using System.Text.Json;
using ChoosinatorFunctions.Models;

namespace ChoosinatorFunctions.Functions
{
    public class PresenceFunction
    {
        [Function("Presence")]
        public static async Task<HttpResponseData> UpdatePresence(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "presence")] HttpRequestData req,
            [CosmosDBInput("choosinator", "pollPresence", Connection = "COSMOS_CONNECTION_STRING")] CosmosClient cosmosClient)
        {
            try
            {
                // Read request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<PresenceRequest>(requestBody);

                if (request?.PollId == null || request?.ClientId == null)
                {
                    var badResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResponse.WriteStringAsync("Missing pollId or clientId");
                    return badResponse;
                }

                var container = cosmosClient.GetContainer("choosinator", "pollPresence");

                var presenceRecord = new PresenceRecord
                {
                    Id = $"{request.PollId}:{request.ClientId}",
                    PollId = request.PollId,
                    ClientId = request.ClientId,
                    DisplayName = request.DisplayName ?? "Anonymous",
                    LastSeenAt = DateTime.UtcNow,
                    TTL = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeSeconds()
                };

                await container.UpsertItemAsync(presenceRecord);

                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new { success = true, message = "Presence updated" });
                return response;
            }
            catch (Exception ex)
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteStringAsync($"Error: {ex.Message}");
                return errorResponse;
            }
        }
    }
}

