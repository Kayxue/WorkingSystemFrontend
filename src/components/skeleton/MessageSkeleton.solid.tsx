import { For } from "solid-js";

const MessageSkeleton = () => {
  return (
    <div class="flex flex-col gap-4 p-4">
      <For each={Array(8)}>
        {() => (
          <>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div class="flex-1">
                <div class="h-4 bg-gray-200 rounded w-1/4 animate-pulse mb-2"></div>
                <div class="h-10 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-row-reverse">
              <div class="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div class="flex-1">
                <div class="h-4 bg-gray-200 rounded w-1/4 animate-pulse mb-2 ml-auto"></div>
                <div class="h-10 bg-gray-200 rounded w-3/4 animate-pulse ml-auto"></div>
              </div>
            </div>
          </>
        )}
      </For>
    </div>
  );
};

export default MessageSkeleton;
