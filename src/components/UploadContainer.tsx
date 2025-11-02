"use client";

import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

const UploadContainer = () => {
  // const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (files: File[]) => {
      const formData = new FormData();
      formData.append("file", files[0]);
      return axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      // queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Do something with the files
      console.log(acceptedFiles[0]);
      mutation.mutate(acceptedFiles);
    },
    [mutation]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-4 mt-20 w-[80%]",
          {
            "border-blue-500": isDragActive,
          }
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-center text-gray-500 text-sm hover:cursor-pointer">
            松开以上传文件
          </p>
        ) : (
          <p className="text-center text-gray-500 text-sm hover:cursor-pointer">
            点击上传或者拖动文件到此
          </p>
        )}
      </div>
    </div>
  );
};

export default UploadContainer;
