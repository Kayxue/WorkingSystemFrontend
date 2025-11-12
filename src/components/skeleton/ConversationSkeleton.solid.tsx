import { For } from "solid-js";

const ConversationSkeleton = () => {
  return (
    <div class="flex flex-col gap-4 p-4">
      <For each={Array(10)}>
        {() => (
          <div class="flex items-center gap-2">
            <div class="w-full h-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

export default ConversationSkeleton;
