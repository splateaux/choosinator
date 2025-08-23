using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using System.Net;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class NegotiateFunction
    {
        [Function("Negotiate")]
        public static SignalRConnectionInfo Negotiate(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "negotiate")] HttpRequestData req,
            [SignalRConnectionInfoInput(HubName = "choosinator")] SignalRConnectionInfo connectionInfo)
        {
            // Read pollId and userId from request
            var requestBody = JsonSerializer.Deserialize<NegotiateRequest>(req.Body);

            // Return connection info with group assignment
            return new SignalRConnectionInfo
            {
                Url = connectionInfo.Url,
                AccessToken = connectionInfo.AccessToken,
                UserId = requestBody.UserId,
                GroupName = $"poll:{requestBody.PollId}"
            };
        }
    }

    public class NegotiateRequest
    {
        public string UserId { get; set; }
        public string PollId { get; set; }
    }
}

