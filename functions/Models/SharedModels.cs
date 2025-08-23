namespace ChoosinatorFunctions.Models
{
    public class VoteRecord
    {
        public string? Id { get; set; }
        public string? PollId { get; set; }
        public string? UserId { get; set; }
        public string? OptionId { get; set; }
        public int Tokens { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class VoteRequest
    {
        public string? PollId { get; set; }
        public string? UserId { get; set; }
        public string? OptionId { get; set; }
        public int Tokens { get; set; }
    }

    public class PresenceRequest
    {
        public string? PollId { get; set; }
        public string? ClientId { get; set; }
        public string? DisplayName { get; set; }
    }

    public class PresenceRecord
    {
        public string? Id { get; set; }
        public string? PollId { get; set; }
        public string? ClientId { get; set; }
        public string? DisplayName { get; set; }
        public DateTime LastSeenAt { get; set; }
        public long TTL { get; set; }
    }

    public class NegotiateRequest
    {
        public string? PollId { get; set; }
        public string? UserId { get; set; }
    }

    public class ConnectionInfo
    {
        public string? Url { get; set; }
        public string? AccessToken { get; set; }
        public string? GroupName { get; set; }
    }
}
