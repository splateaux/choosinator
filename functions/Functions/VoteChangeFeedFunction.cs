using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.WebJobs.Extensions.CosmosDB;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class VoteChangeFeedFunction
    {
        [Function("VoteChangeFeed")]
        public static async Task Run(
            [CosmosDBTrigger(
                databaseName: "choosinator",
                collectionName: "pollVote",
                ConnectionStringSetting = "CosmosDBConnection",
                LeaseCollectionName = "leases",
                CreateLeaseCollectionIfNotExists = true)] IReadOnlyList<PollVote> input,
            [SignalR(HubName = "choosinator")] IAsyncCollector<SignalRMessage> signalRMessages)
        {
            if (input != null && input.Count > 0)
            {
                foreach (var vote in input)
                {
                    // Create message to broadcast
                    var message = new VoteUpdateMessage
                    {
                        Type = "vote-updated",
                        PollId = vote.PollId,
                        UserId = vote.UserId,
                        Votes = vote.Votes,
                        Timestamp = vote.Timestamp
                    };

                    // Broadcast to the specific poll group
                    await signalRMessages.AddAsync(new SignalRMessage
                    {
                        Target = "voteUpdated",
                        Arguments = new object[] { message },
                        GroupName = $"poll:{vote.PollId}"
                    });
                }
            }
        }
    }

    public class VoteUpdateMessage
    {
        public string Type { get; set; }
        public string PollId { get; set; }
        public string UserId { get; set; }
        public List<VoteOption> Votes { get; set; }
        public DateTime Timestamp { get; set; }
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

