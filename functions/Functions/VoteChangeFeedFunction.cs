using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Extensions.CosmosDB;
using System.Text.Json;
using ChoosinatorFunctions.Models;

namespace ChoosinatorFunctions.Functions
{
    public class VoteChangeFeedFunction
    {
        [Function("VoteChangeFeed")]
        public static void Run(
            [CosmosDBTrigger(
                databaseName: "choosinator",
                containerName: "pollVote",
                Connection = "COSMOS_CONNECTION_STRING",
                LeaseContainerName = "leases")]
            IReadOnlyList<dynamic> input)
        {
            if (input != null && input.Count > 0)
            {
                try
                {
                    // Group changes by pollId for efficient broadcasting
                    var changesByPoll = input
                        .Select(doc => JsonSerializer.Deserialize<VoteRecord>(doc.ToString()))
                        .Where(v => v != null)
                        .GroupBy(v => v!.PollId);

                    foreach (var pollGroup in changesByPoll)
                    {
                        // For now, just log the changes
                        // TODO: Implement SignalR broadcasting when we get the right packages
                        Console.WriteLine($"Poll {pollGroup.Key} has {pollGroup.Count()} vote changes");
                        
                        foreach (var change in pollGroup)
                        {
                            Console.WriteLine($"  - User {change!.UserId} voted {change.Tokens} tokens on option {change.OptionId}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Log error but don't fail the function
                    Console.WriteLine($"Error processing change feed: {ex.Message}");
                }
            }
        }
    }
}

