using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Extensions.CosmosDB;
using Microsoft.Azure.Cosmos;
using System.Net;
using System.Text.Json;
using ChoosinatorFunctions.Models;

namespace ChoosinatorFunctions.Functions
{
    public class VoteFunction
    {
        [Function("Vote")]
        public static async Task<HttpResponseData> Vote(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "vote")] HttpRequestData req,
            [CosmosDBInput("choosinator", "pollVote", Connection = "COSMOS_CONNECTION_STRING")] CosmosClient cosmosClient)
        {
            try
            {
                // Read request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<VoteRequest>(requestBody);

                if (request?.PollId == null || request?.UserId == null || request?.OptionId == null)
                {
                    var badResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResponse.WriteStringAsync("Missing required fields");
                    return badResponse;
                }

                var container = cosmosClient.GetContainer("choosinator", "pollVote");

                // Get current user votes for this poll
                var query = container.GetItemQueryIterator<VoteRecord>(
                    new QueryDefinition("SELECT * FROM c WHERE c.pollId = @pollId AND c.userId = @userId")
                        .WithParameter("@pollId", request.PollId)
                        .WithParameter("@userId", request.UserId)
                );

                var totalTokens = 0;
                while (query.HasMoreResults)
                {
                    var response = await query.ReadNextAsync();
                    totalTokens += response.Sum(v => v.Tokens);
                }

                // Check token limit (≤10 per user)
                if (totalTokens + request.Tokens > 10)
                {
                    var limitResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                    await limitResponse.WriteStringAsync("Token limit exceeded (max 10 per user)");
                    return limitResponse;
                }

                // Create or update vote record
                var voteRecord = new VoteRecord
                {
                    Id = $"{request.PollId}:{request.UserId}:{request.OptionId}",
                    PollId = request.PollId,
                    UserId = request.UserId,
                    OptionId = request.OptionId,
                    Tokens = request.Tokens,
                    UpdatedAt = DateTime.UtcNow
                };

                await container.UpsertItemAsync(voteRecord);

                var successResponse = req.CreateResponse(HttpStatusCode.OK);
                await successResponse.WriteAsJsonAsync(new { success = true, message = "Vote recorded successfully" });
                return successResponse;
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

