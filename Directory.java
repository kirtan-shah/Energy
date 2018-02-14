/**

*/

import java.util.ArrayList;
import java.io.File;

public class Directory extends FileEntity {

    private ArrayList<FileEntity> contents;

    public Directory(File file) {
        super(file);
    }
    public Directory(String path) {
        super(path);
    }

    public Directory getChildDirectory(String name) {
        for(FileEntity fe : contents) {
            if(fe instanceof Directory && fe.getFile().getName().equals(name))
                return (Directory) fe;
        }
        return null;
    }

    public String toString() {
        String str = "";
        for(FileEntity fe : contents) {
            if(fe instanceof Directory) {
                str += "/";
            }
            str += fe.getFile().getName() + "\n";
        }
        return str;
    }

    public void setContents(ArrayList<FileEntity> contents) {
        this.contents = contents;
    }
}
