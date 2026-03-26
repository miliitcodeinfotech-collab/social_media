import { Post } from "../models/Post.model.js";

// Memory queue to hold incoming like/unlike actions temporarily
let likeEventsQueue = [];

// Enqueue action to be processed by background worker
export const queueLikeAction = (postId, memberId, action) => {
    likeEventsQueue.push({ 
        postId: postId.toString(), 
        memberId: memberId.toString(), 
        action 
    });
};

// Background Worker: Processes the queue every 2 seconds efficiently
const processLikeQueue = async () => {
    if (likeEventsQueue.length === 0) return;

    // Take a snapshot of current events and clear the main queue immediately
    // so new requests don't block
    const itemsToProcess = [...likeEventsQueue];
    likeEventsQueue = [];

    // Map to keep the LATEST action if a member liked/unliked rapidly
    const latestActions = new Map();
    itemsToProcess.forEach(item => {
        latestActions.set(`${item.postId}-${item.memberId}`, item);
    });

    try {
        const bulkOperations = [];

        for (const [key, item] of latestActions.entries()) {
            if (item.action === 'LIKE') {
                bulkOperations.push({
                    updateOne: {
                        filter: { _id: item.postId, isDeleted: false },
                        update: { 
                            $addToSet: { likedBy: item.memberId }, 
                            $inc: { likesCount: 1 } 
                        }
                    }
                });
            } else if (item.action === 'UNLIKE') {
                bulkOperations.push({
                    updateOne: {
                        filter: { _id: item.postId, isDeleted: false },
                        update: { 
                            $pull: { likedBy: item.memberId }, 
                            $inc: { likesCount: -1 } 
                        }
                    }
                });
            }
        }

        if (bulkOperations.length > 0) {
            // Write to MongoDB all at once instead of hundreds of calls
            await Post.bulkWrite(bulkOperations, { ordered: false });
            // console.log(`[Like Worker] Processed ${bulkOperations.length} batched likes successfully.`);
        }

    } catch (error) {
        console.error("[Like Worker] Error processing bulk likes: ", error);
        // If DB crashes, put them back into the queue to try again
        likeEventsQueue.push(...itemsToProcess);
    }
};

// Start the worker on app initialization
export const startLikeWorker = () => {
    setInterval(processLikeQueue, 2000); // Runs every 2 seconds
    console.log("[Like Worker] Started Write-Behind Background Sync");
};
