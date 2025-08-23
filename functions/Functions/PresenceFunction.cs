using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.WebJobs.Extensions.CosmosDB;
using System.Net;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class PresenceFunction
    {
        [Function("UpdatePresence")]
        public static async Task<HttpResponseData> UpdatePresence(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "presence")] HttpRequestData req,
            [CosmosDB("choosinator", "pollPresence", ConnectionStringSetting = "CosmosDBConnection")] IAsyncCollector<PollPresence> presenceCollector)
        {
            try
            {
                var requestBody = JsonSerializer.Deserialize<PresenceRequest>(req.Body);
                
                // Validate request
                if (string.IsNullOrEmpty(requestBody.UserId) || 
                    string.IsNullOrEmpty(requestBody.PollId))
                {
                    var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badRequest.WriteAsJsonAsync(new { error = "Invalid request data" });
                    return badRequest;
                }

                // Create presence document with TTL
                var presence = new PollPresence
                {
                    Id = $"{requestBody.PollId}:{requestBody.UserId}",
                    PollId = requestBody.PollId,
                    UserId = requestBody.UserId,
                    LastSeen = DateTime.UtcNow,
                    TTL = (int)(DateTime.UtcNow.AddMinutes(5) - new DateTime(1970, 1, 1)).TotalSeconds
                };

                // Save to Cosmos DB
                await presenceCollector.AddAsync(presence);

                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new { success = true });
                return response;
            }
            catch (Exception ex)
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteAsJsonAsync(new { error = ex.Message });
                return errorResponse;
            }
        }

        [Function("GetPresence")]
        public static async Task<HttpResponseData> GetPresence(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "presence/{pollId}")] HttpRequestData req,
            string pollId,
            [CosmosDB("choosinator", "pollPresence", ConnectionStringSetting = "CosmosDBConnection")] IAsyncCollector<PollPresence> presenceCollector)
        {
            try
            {
                // This would typically query Cosmos DB for active presence
                // For now, return a simple response
                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new { pollId, activeUsers = 0 });
                return response;
            }
            catch (Exception ex)
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteAsJsonAsync(new { error = ex.Message });
                return errorResponse;
            }
        }
    }

    public class PresenceRequest
    {
        public string UserId { get; set; }
        public string PollId { get; set; }
    }

    public class PollPresence
    {
        public string Id { get; set; }
        public string PollId { get; set; }
        public string UserId { get; set; }
        public DateTime LastSeen { get; set; }
        public int TTL { get; set; }
    }
}

