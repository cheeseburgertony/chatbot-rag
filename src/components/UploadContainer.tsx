"use client";

import { FileModel } from "@/db/schema";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { toast } from "sonner";

const UploadContainer = () => {
  const queryClient = useQueryClient();
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
  const [openDialogId, setOpenDialogId] = useState<number | null>(null);

  const { data: files, isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: () => {
      return axios.get("/api/get-files");
    },
  });

  const { mutate, isPending } = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("文件上传成功");
    },
    onError: (error) => {
      console.error("上传失败:", error);
      toast.error("文件上传失败，请重试");
    },
  });

  const { mutate: deleteFile, isPending: isDeleting } = useMutation({
    mutationFn: (fileId: number) => {
      setDeletingFileId(fileId);
      return axios.delete(`/api/delete-file/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setDeletingFileId(null);
      setOpenDialogId(null);
      toast.success("文件删除成功");
    },
    onError: (error) => {
      setDeletingFileId(null);
      console.error("删除失败:", error);
      toast.error("文件删除失败，请重试");
    },
  });

  const handleDelete = (e: React.MouseEvent, fileId: number) => {
    e.preventDefault();
    deleteFile(fileId);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Do something with the files
      // console.log(acceptedFiles[0]);
      mutate(acceptedFiles);
    },
    [mutate]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "text/markdown": [".md"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
  });

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-4 mt-20 w-[80%] hover:border-blue-500 cursor-pointer transition-colors duration-300",
          {
            "border-blue-500": isDragActive,
          }
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {isPending ? (
          <p className="text-center text-gray-500 text-sm">上传中...</p>
        ) : (
          <p className="text-center text-gray-500 text-sm">
            点击上传或者拖动文件到此
          </p>
        )}
      </div>
      <div className="w-[80%] flex-1 overflow-y-auto mt-8">
        {isLoading ? (
          <p className="text-center text-gray-500 text-sm mt-20">
            加载文件中...
          </p>
        ) : files?.data.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-20">暂无文件</p>
        ) : (
          <div className="space-y-2">
            {files?.data.map((file: FileModel) => (
              <div
                key={file.id}
                className="group flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {/* 文件图标 */}
                <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <svg
                    className="w-6 h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file_name}
                  </p>
                </div>

                {/* 删除按钮 */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog
                    open={openDialogId === file.id}
                    onOpenChange={(open) => {
                      setOpenDialogId(open ? file.id! : null);
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={deletingFileId === file.id}
                      >
                        {deletingFileId === file.id ? (
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除&quot;{file.file_name}
                          &quot;吗？此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          className="cursor-pointer"
                          disabled={isDeleting}
                        >
                          取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                          type="button"
                          className="bg-red-600 text-white hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={(e) => handleDelete(e, file.id!)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>删除中...</span>
                            </div>
                          ) : (
                            "继续"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadContainer;
