import { useSearchParams } from "react-router-dom";
import ProjectManageList from "./ProjectManageList";
import ProjectManageDetail from "./ProjectManageDetail";

const ProjectManage = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || "";

  return projectId ? <ProjectManageDetail projectId={projectId} /> : <ProjectManageList />;
};

export default ProjectManage;
