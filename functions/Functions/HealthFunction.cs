using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace ChoosinatorFunctions.Functions
{
    public class HealthFunction
    {
        [Function("Health")]
        public static HttpResponseData Health(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData req)
        {
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.WriteString("Azure Functions are healthy!");
            return response;
        }
    }
}
