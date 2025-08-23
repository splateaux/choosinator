using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.WebJobs.Extensions.CosmosDB;
using System.Net;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class VoteFunction
    {
        [Function("Vote")]
        public static async Task<HttpResponseData> Vote(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "vote")] HttpRequestData req,
            [CosmosDB("choosinator", "pollVote", ConnectionStringSetting = "CosmosDBConnection")] IAsyncCollector<PollVote> voteCollector)
        {
            try
            {
                var requestBody = JsonSerializer.Deserialize<VoteRequest>(req.Body);
                
                // Validate request
                if (string.IsNullOrEmpty(requestBody.UserId) || 
                    string.IsNullOrEmpty(requestBody.PollId) || 
                    requestBody.Votes == null || 
                    !requestBody.Votes.Any())
                {
                    var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badRequest.WriteAsJsonAsync(new { error = "Invalid request data" });
                    return badRequest;
                }

                // Create vote document
                var vote = new PollVote
                {
                    Id = $"{requestBody.PollId}:{requestBody.UserId}",
                    PollId = requestBody.PollId,
                    UserId = requestBody.UserId,
                    Votes = requestBody.Votes,
                    Timestamp = DateTime.UtcNow
                };

                // Save to Cosmos DB
                await voteCollector.AddAsync(vote);

                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new { success = true, voteId = vote.Id });
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

    public class VoteRequest
    {
        public string UserId { get; set; }
        public string PollId { get; set; }
        public List<VoteOption> Votes { get; set; }
    }

    public class VoteOption
    {
        public string OptionId { get; set; }
        public int Tokens { get; set; }
    }

    public class PollVote
    {
        public string Id { get; set; }
        public string PollId { get; set; }
        public string UserId { get; set; }
        public List<VoteOption> Votes { get; set; }
        public DateTime Timestamp { get; set; }
    }
}

