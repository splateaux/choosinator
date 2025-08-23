using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System.Text.Json;
using ChoosinatorFunctions.Models;

namespace ChoosinatorFunctions.Functions
{
    public class NegotiateFunction
    {
        [Function("Negotiate")]
        public static async Task<HttpResponseData> Negotiate(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "negotiate")] HttpRequestData req)
        {
            try
            {
                // Read request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<NegotiateRequest>(requestBody);

                if (request?.PollId == null || request?.UserId == null)
                {
                    var badResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResponse.WriteStringAsync("Missing pollId or userId");
                    return badResponse;
                }

                // Create connection info for Web PubSub
                var connectionInfo = new ConnectionInfo
                {
                    Url = Environment.GetEnvironmentVariable("WEBPUBSUB_CONNECTION_STRING"),
                    AccessToken = "dummy-token", // Web PubSub handles auth differently
                    GroupName = $"poll:{request.PollId}"
                };

                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(connectionInfo);
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

