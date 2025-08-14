// streams/pollVote/index.mjs
// AWS-only: DynamoDB Stream → Event bridge
// This runs in production when DynamoDB Streams fire

import arc from "@architect/functions";

// Helper to extract String attributes from DynamoDB stream record
function getStringValue(attr) {
  return attr?.S;
}

export const handler = async (event) => {
  console.log("MORTON - start of handler");
  console.log("pollVote stream event:", JSON.stringify(event, null, 2));

  // If for some reason this runs locally, early return
  if (process.env.ARC_LOCAL === "true") {
    console.log(
      "Stream handler running locally, skipping (events are published directly)",
    );
    return;
  }

  try {
    for (const record of event.Records) {
      // Only process INSERT and MODIFY events (ignore REMOVE for now)
      if (record.eventName !== "INSERT" && record.eventName !== "MODIFY") {
        console.log(`Skipping ${record.eventName} event`);
        continue;
      }

      const newImage = record.dynamodb.NewImage || {};
      const payload = {
        pk: getStringValue(newImage.pk),
        sk: getStringValue(newImage.sk),
        userId: getStringValue(newImage.userId),
        optionId: getStringValue(newImage.optionId),
        updatedAt: getStringValue(newImage.updatedAt),
        tokens: newImage.tokens?.N ? Number(newImage.tokens.N) : undefined,
        source: "stream",
      };

      console.log(`Publishing vote-updated event from stream:`, payload);

      // Publish the same event that the local writer publishes
      await arc.events.publish({
        name: "vote-updated",
        payload,
      });
    }

    console.log("Stream processing completed successfully");
  } catch (error) {
    console.error("Error processing pollVote stream:", error);
    throw error; // Let the stream system handle retries
  }

  return { statusCode: 200 };
};
