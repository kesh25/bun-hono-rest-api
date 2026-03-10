// import { Thread } from "../models/thread.model";
// import { Types } from "mongoose";

// /**
//  * Get total unread count for given mailboxes and folders
//  */
// export async function getTotalUnreadCount({
//   mailboxIds,
//   folders = ["Inbox"],
// }: {
//   mailboxIds: string[] | Types.ObjectId[];
//   folders?: string[];
// }): Promise<number> {
//   // convert string IDs to ObjectId if necessary
//   const mailboxObjectIds = mailboxIds.map((id) =>
//     typeof id === "string" ? new Types.ObjectId(id) : id,
//   );

//   const result = await Thread.aggregate([
//     {
//       $match: {
//         mailboxId: { $in: mailboxObjectIds },
//         folders: { $in: folders },
//       },
//     },
//     {
//       $group: {
//         _id: null,
//         totalUnread: { $sum: "$unreadCount" },
//       },
//     },
//   ]);

//   return result.length > 0 ? result[0].totalUnread : 0;
// }

import { Thread } from "../models/thread.model";
import { Types } from "mongoose";

const EXCLUSIVE_FOLDERS = ["Trash", "Spam", "Archive"];

export async function getTotalUnreadCount({
  mailboxIds,
  folders = ["Inbox"],
}: {
  mailboxIds: string[] | Types.ObjectId[];
  folders?: string[];
}): Promise<number> {
  const mailboxObjectIds = mailboxIds.map((id) =>
    typeof id === "string" ? new Types.ObjectId(id) : id,
  );

  const result = await Thread.aggregate([
    {
      $match: {
        mailboxId: { $in: mailboxObjectIds },
        $or: [
          {
            // for exclusive folders, match only if the primary folder equals
            folder: {
              $in: folders.filter((f) => EXCLUSIVE_FOLDERS.includes(f)),
            },
          },
          {
            // for non-exclusive folders, match if they are in folders array
            folders: {
              $in: folders.filter((f) => !EXCLUSIVE_FOLDERS.includes(f)),
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: null,
        totalUnread: { $sum: "$unreadCount" },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalUnread : 0;
}
