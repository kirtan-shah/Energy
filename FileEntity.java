import java.io.File;

public class FileEntity {

    private File file;

    public FileEntity(File file) {
        this.file = file;
    }

    public FileEntity(String path) {
        file = new File(path);
    }

    public File getFile() {
        return file;
    }

    public void setFile(File file) {
        this.file = file;
    }

}
